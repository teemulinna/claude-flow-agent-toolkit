#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatic hook fixing utility for Claude Flow agents
class AutoHookFixer {
  constructor() {
    this.agentsDir = path.join(__dirname, '..', '.claude', 'agents');
    this.fixed = [];
    this.skipped = [];
    this.errors = [];
  }

  async autoFixAll() {
    console.log('🤖 Auto-fixing Claude Flow agent hooks...\n');
    
    const agentFiles = await this.findAgentFiles();
    
    for (const file of agentFiles) {
      await this.autoFixAgent(file);
    }
    
    this.reportResults();
  }

  async findAgentFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          walkDir(fullPath);
        } else if (item.endsWith('.md') && !item.startsWith('README') && !item.includes('template')) {
          files.push(fullPath);
        }
      }
    };
    
    walkDir(this.agentsDir);
    return files;
  }

  async autoFixAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip files without hooks
      if (!content.includes('hooks:')) {
        console.log(`⏭️  ${relativePath}: No hooks section - skipping`);
        this.skipped.push(relativePath);
        return;
      }

      let newContent = content;
      let changesMade = [];

      // 1. Replace undefined memory functions
      const memoryReplacements = [
        {
          from: /memory_store\s+"([^"]+)"\s+"([^"]+)"/g,
          to: 'npx claude-flow@alpha memory store "$1" "$2" --namespace="agent"',
          desc: 'memory_store function'
        },
        {
          from: /memory_search\s+"([^"]+)"/g,
          to: 'npx claude-flow@alpha memory search "$1" --namespace="agent"',
          desc: 'memory_search function'
        },
        {
          from: /memory_retrieve\s+"([^"]+)"/g,
          to: 'npx claude-flow@alpha memory retrieve "$1" --namespace="agent"',
          desc: 'memory_retrieve function'
        }
      ];

      for (const replacement of memoryReplacements) {
        if (replacement.from.test(newContent)) {
          newContent = newContent.replace(replacement.from, replacement.to);
          changesMade.push(`Fixed ${replacement.desc}`);
        }
      }

      // 2. Replace undefined variables
      const variableReplacements = [
        { from: /\$\{TASK_ID\}/g, to: '$AGENT_TASK', desc: '${TASK_ID} variable' },
        { from: /\$\{SWARM_ID\}/g, to: '$AGENT_TASK', desc: '${SWARM_ID} variable' },
        { from: /\$\{AGENT_ID\}/g, to: '$AGENT_TASK', desc: '${AGENT_ID} variable' },
        { from: /\$TASK\b/g, to: '$AGENT_TASK', desc: '$TASK variable' }
      ];

      for (const replacement of variableReplacements) {
        if (replacement.from.test(newContent)) {
          newContent = newContent.replace(replacement.from, replacement.to);
          changesMade.push(`Fixed ${replacement.desc}`);
        }
      }

      // 3. Add missing on_error hook if not present
      if (content.includes('hooks:') && !content.includes('on_error:')) {
        const agentName = this.extractAgentName(content, filePath);
        const onErrorHook = `  on_error: |
    echo "⚠️ ${agentName} agent error: {{error_message}}"
    npx claude-flow@alpha memory store "agent_error_$(date +%s)" "Error in ${agentName}: {{error_message}}" --namespace="errors"
    echo "🔄 Attempting recovery..."`;

        // Find the hooks section and add on_error before the closing ---
        const hooksEnd = newContent.indexOf('\n---', newContent.indexOf('hooks:'));
        if (hooksEnd !== -1) {
          newContent = newContent.slice(0, hooksEnd) + onErrorHook + '\n' + newContent.slice(hooksEnd);
          changesMade.push('Added on_error hook');
        }
      }

      // 4. Improve echo messages to use proper variable
      newContent = newContent.replace(
        /echo "([^"]*): \$TASK"/g,
        'echo "$1: $AGENT_TASK"'
      );

      // Only write if changes were made
      if (changesMade.length > 0) {
        // Create backup
        fs.writeFileSync(filePath + '.backup', content);
        fs.writeFileSync(filePath, newContent);
        
        console.log(`✅ ${relativePath}:`);
        changesMade.forEach(change => console.log(`   - ${change}`));
        this.fixed.push({ file: relativePath, changes: changesMade });
      } else {
        console.log(`✨ ${relativePath}: Already compliant`);
        this.skipped.push(relativePath);
      }
      
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`❌ Error fixing ${relativePath}: ${error.message}`);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  extractAgentName(content, filePath) {
    // Try to extract from name: field in YAML frontmatter
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // Fallback to filename
    return path.basename(filePath, '.md');
  }

  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AUTO-FIX RESULTS');
    console.log('='.repeat(60));
    
    console.log(`✅ Fixed: ${this.fixed.length} files`);
    console.log(`⏭️  Skipped: ${this.skipped.length} files`);
    console.log(`❌ Errors: ${this.errors.length} files`);
    
    if (this.fixed.length > 0) {
      console.log('\n📝 CHANGES MADE:');
      const changeTypes = {};
      
      for (const fix of this.fixed) {
        for (const change of fix.changes) {
          changeTypes[change] = (changeTypes[change] || 0) + 1;
        }
      }
      
      for (const [change, count] of Object.entries(changeTypes)) {
        console.log(`   ${change}: ${count} files`);
      }
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`   ${error.file}: ${error.error}`);
      }
    }
    
    console.log('\n💾 BACKUP INFO:');
    console.log('   Original files backed up with .backup extension');
    console.log('   To restore: for f in **/*.backup; do mv "$f" "${f%.backup}"; done');
    
    console.log('\n🔍 NEXT STEPS:');
    console.log('1. Run: npm run fix-hooks-interactive (for remaining issues)');
    console.log('2. Test hooks with sample agents');
    console.log('3. Remove .backup files when satisfied');
  }
}

// Run the auto-fixer
const fixer = new AutoHookFixer();
await fixer.autoFixAll();