#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interactive hook fixing utility for Claude Flow agents
class InteractiveHookFixer {
  constructor(agentsDir) {
    // Use provided agentsDir or default to current working directory
    this.agentsDir = agentsDir || path.join(process.cwd(), '.claude', 'agents');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.fixed = [];
    this.skipped = [];
    this.errors = [];
  }

  async interactiveFixAll() {
    console.log('🎯 Interactive Claude Flow Agent Hook Fixer');
    console.log('═'.repeat(60));
    console.log('This tool will guide you through fixing hook issues in each agent.');
    console.log('You can choose to fix, skip, or customize each change.\n');
    
    const agentFiles = await this.findAgentFiles();
    console.log(`Found ${agentFiles.length} agent files to process.\n`);
    
    for (const file of agentFiles) {
      await this.interactiveFixAgent(file);
    }
    
    this.reportResults();
    this.rl.close();
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
    return files.sort();
  }

  async interactiveFixAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      console.log('\n' + '─'.repeat(80));
      console.log(`🔧 Processing: ${relativePath}`);
      console.log('─'.repeat(80));
      
      // Skip files without hooks
      if (!content.includes('hooks:')) {
        console.log('⏭️  No hooks section found - skipping');
        this.skipped.push(relativePath);
        return;
      }

      const issues = this.analyzeHooks(content, relativePath);
      
      if (issues.length === 0) {
        console.log('✨ No issues found - hooks are already valid!');
        this.skipped.push(relativePath);
        return;
      }

      console.log(`Found ${issues.length} issue(s):`);
      issues.forEach((issue, i) => console.log(`  ${i+1}. ${issue.description}`));
      
      const agentInfo = this.getAgentInfo(content);
      console.log(`\nAgent Info: ${agentInfo.name} (${agentInfo.type}) - ${agentInfo.description}`);
      
      const choice = await this.askQuestion('\nHow do you want to proceed? (f)ix all, (i)nteractive, (s)kip, (v)iew hooks: ');
      
      let newContent = content;
      let changesMade = [];
      
      switch (choice.toLowerCase()) {
        case 'f':
          // Auto-fix all issues
          const result = this.autoFixIssues(content, issues);
          newContent = result.content;
          changesMade = result.changes;
          break;
          
        case 'i':
          // Interactive fix each issue
          const interactiveResult = await this.interactiveFixIssues(content, issues, agentInfo);
          newContent = interactiveResult.content;
          changesMade = interactiveResult.changes;
          break;
          
        case 's':
          console.log('⏭️  Skipping this agent');
          this.skipped.push(relativePath);
          return;
          
        case 'v':
          // View hooks section and ask again
          this.displayHooksSection(content);
          return await this.interactiveFixAgent(filePath);
          
        default:
          console.log('Invalid choice - skipping');
          this.skipped.push(relativePath);
          return;
      }
      
      // Apply changes if any were made
      if (changesMade.length > 0) {
        const confirm = await this.askQuestion(`\nApply ${changesMade.length} change(s)? (y/n): `);
        if (confirm.toLowerCase() === 'y') {
          // Create backup
          fs.writeFileSync(filePath + '.backup', content);
          fs.writeFileSync(filePath, newContent);
          
          console.log('✅ Changes applied successfully!');
          changesMade.forEach(change => console.log(`   - ${change}`));
          this.fixed.push({ file: relativePath, changes: changesMade });
        } else {
          console.log('⏭️  Changes cancelled');
          this.skipped.push(relativePath);
        }
      }
      
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`❌ Error processing ${relativePath}: ${error.message}`);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  analyzeHooks(content, filePath) {
    const issues = [];
    
    // Check for undefined functions
    if (content.match(/memory_store\s/)) {
      issues.push({ type: 'undefined_function', description: 'Uses undefined memory_store function', pattern: /memory_store\s+"([^"]+)"\s+"([^"]+)"/g });
    }
    if (content.match(/memory_search\s/)) {
      issues.push({ type: 'undefined_function', description: 'Uses undefined memory_search function', pattern: /memory_search\s+"([^"]+)"/g });
    }
    if (content.match(/memory_retrieve\s/)) {
      issues.push({ type: 'undefined_function', description: 'Uses undefined memory_retrieve function', pattern: /memory_retrieve\s+"([^"]+)"/g });
    }
    
    // Check for undefined variables
    if (content.includes('${TASK_ID}')) {
      issues.push({ type: 'undefined_variable', description: 'Uses undefined ${TASK_ID} variable', pattern: /\$\{TASK_ID\}/g });
    }
    if (content.includes('${SWARM_ID}')) {
      issues.push({ type: 'undefined_variable', description: 'Uses undefined ${SWARM_ID} variable', pattern: /\$\{SWARM_ID\}/g });
    }
    
    // Check for problematic MCP calls in hooks
    if (content.includes('mcp__claude-flow__swarm_init')) {
      issues.push({ type: 'mcp_in_hooks', description: 'MCP swarm_init call in hooks (should be in execution)', pattern: /mcp__claude-flow__swarm_init/g });
    }
    if (content.includes('mcp__claude-flow__agent_spawn')) {
      issues.push({ type: 'mcp_in_hooks', description: 'MCP agent_spawn call in hooks (should be in execution)', pattern: /mcp__claude-flow__agent_spawn/g });
    }
    if (content.includes('mcp__claude-flow__task_orchestrate')) {
      issues.push({ type: 'mcp_in_hooks', description: 'MCP task_orchestrate call in hooks (should be in execution)', pattern: /mcp__claude-flow__task_orchestrate/g });
    }
    
    // Check for missing error handling
    if (content.includes('hooks:') && !content.includes('on_error:')) {
      issues.push({ type: 'missing_error_hook', description: 'Missing on_error hook for error handling' });
    }
    
    return issues;
  }

  async interactiveFixIssues(content, issues, agentInfo) {
    let newContent = content;
    let changesMade = [];
    
    for (const issue of issues) {
      console.log(`\n🔍 Issue: ${issue.description}`);
      
      if (issue.pattern) {
        // Show matches in context
        const matches = [...content.matchAll(issue.pattern)];
        if (matches.length > 0) {
          console.log('Found occurrences:');
          matches.forEach((match, i) => {
            const context = this.getContext(content, match.index, 50);
            console.log(`  ${i+1}. "${match[0]}" in: ...${context}...`);
          });
        }
      }
      
      const action = await this.askQuestion('Action: (f)ix, (s)kip, (c)ustom, (h)elp: ');
      
      switch (action.toLowerCase()) {
        case 'f':
          const fixResult = this.applyStandardFix(newContent, issue, agentInfo);
          newContent = fixResult.content;
          if (fixResult.change) {
            changesMade.push(fixResult.change);
            console.log(`✅ Applied fix: ${fixResult.change}`);
          }
          break;
          
        case 's':
          console.log('⏭️  Skipping this issue');
          break;
          
        case 'c':
          const customResult = await this.applyCustomFix(newContent, issue, agentInfo);
          newContent = customResult.content;
          if (customResult.change) {
            changesMade.push(customResult.change);
            console.log(`✅ Applied custom fix: ${customResult.change}`);
          }
          break;
          
        case 'h':
          this.showHelp(issue, agentInfo);
          // Ask again for this issue
          const retryResult = await this.interactiveFixIssues(newContent, [issue], agentInfo);
          newContent = retryResult.content;
          changesMade.push(...retryResult.changes);
          break;
          
        default:
          console.log('Invalid choice - skipping issue');
      }
    }
    
    return { content: newContent, changes: changesMade };
  }

  applyStandardFix(content, issue, agentInfo) {
    let newContent = content;
    let change = null;
    
    switch (issue.type) {
      case 'undefined_function':
        if (issue.pattern.source.includes('memory_store')) {
          newContent = newContent.replace(issue.pattern, 'npx claude-flow@alpha memory store "$1" "$2" --namespace="agent"');
          change = 'Fixed memory_store function calls';
        } else if (issue.pattern.source.includes('memory_search')) {
          newContent = newContent.replace(issue.pattern, 'npx claude-flow@alpha memory search "$1" --namespace="agent"');
          change = 'Fixed memory_search function calls';
        } else if (issue.pattern.source.includes('memory_retrieve')) {
          newContent = newContent.replace(issue.pattern, 'npx claude-flow@alpha memory retrieve "$1" --namespace="agent"');
          change = 'Fixed memory_retrieve function calls';
        }
        break;
        
      case 'undefined_variable':
        newContent = newContent.replace(issue.pattern, '$AGENT_TASK');
        change = `Fixed undefined variables to use $AGENT_TASK`;
        break;
        
      case 'mcp_in_hooks':
        // For MCP calls, we'll comment them out with explanation
        if (issue.pattern) {
          newContent = newContent.replace(issue.pattern, '# REMOVED: $& (MCP calls should be in agent execution, not hooks)');
          change = 'Commented out MCP calls in hooks';
        }
        break;
        
      case 'missing_error_hook':
        const onErrorHook = `  on_error: |
    echo "⚠️ ${agentInfo.name} agent error: {{error_message}}"
    npx claude-flow@alpha memory store "agent_error_$(date +%s)" "Error in ${agentInfo.name}: {{error_message}}" --namespace="errors"
    echo "🔄 Attempting recovery..."`;
        
        const hooksEnd = newContent.indexOf('\n---', newContent.indexOf('hooks:'));
        if (hooksEnd !== -1) {
          newContent = newContent.slice(0, hooksEnd) + onErrorHook + '\n' + newContent.slice(hooksEnd);
          change = 'Added on_error hook';
        }
        break;
    }
    
    return { content: newContent, change };
  }

  async applyCustomFix(content, issue, agentInfo) {
    console.log('\n📝 Custom Fix Mode');
    console.log('Current issue context:');
    
    if (issue.pattern) {
      const matches = [...content.matchAll(issue.pattern)];
      matches.forEach((match, i) => {
        const context = this.getContext(content, match.index, 100);
        console.log(`\nMatch ${i+1}:`);
        console.log(`"${match[0]}"`);
        console.log(`Context: ...${context}...`);
      });
    }
    
    const customFix = await this.askQuestion('Enter your custom replacement (or press Enter to skip): ');
    
    if (!customFix.trim()) {
      return { content, change: null };
    }
    
    if (issue.pattern) {
      const newContent = content.replace(issue.pattern, customFix);
      return { content: newContent, change: `Custom fix applied: ${customFix}` };
    }
    
    return { content, change: null };
  }

  autoFixIssues(content, issues) {
    let newContent = content;
    let changesMade = [];
    
    for (const issue of issues) {
      const result = this.applyStandardFix(newContent, issue, { name: 'agent' });
      newContent = result.content;
      if (result.change) {
        changesMade.push(result.change);
      }
    }
    
    return { content: newContent, changes: changesMade };
  }

  getAgentInfo(content) {
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const typeMatch = content.match(/^type:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : 'unknown',
      type: typeMatch ? typeMatch[1].trim() : 'unknown',
      description: descMatch ? descMatch[1].trim() : 'No description'
    };
  }

  displayHooksSection(content) {
    const hooksStart = content.indexOf('hooks:');
    if (hooksStart === -1) {
      console.log('No hooks section found');
      return;
    }
    
    const nextSection = content.indexOf('\n---', hooksStart);
    const hooksEnd = nextSection === -1 ? content.length : nextSection;
    const hooksContent = content.substring(hooksStart, hooksEnd);
    
    console.log('\n📋 Current hooks section:');
    console.log('─'.repeat(40));
    console.log(hooksContent);
    console.log('─'.repeat(40));
  }

  getContext(content, index, length) {
    const start = Math.max(0, index - length);
    const end = Math.min(content.length, index + length);
    return content.substring(start, end).replace(/\n/g, ' ');
  }

  showHelp(issue, agentInfo) {
    console.log('\n📚 HELP: ' + issue.description);
    console.log('─'.repeat(50));
    
    switch (issue.type) {
      case 'undefined_function':
        console.log('Problem: Using undefined memory functions');
        console.log('Solution: Replace with proper npx claude-flow@alpha commands');
        console.log('Example:');
        console.log('  Before: memory_store "key" "value"');
        console.log('  After:  npx claude-flow@alpha memory store "key" "value" --namespace="agent"');
        break;
        
      case 'undefined_variable':
        console.log('Problem: Using undefined shell variables');
        console.log('Solution: Use $AGENT_TASK instead');
        console.log('Example:');
        console.log('  Before: echo "Task: ${TASK_ID}"');
        console.log('  After:  echo "Task: $AGENT_TASK"');
        break;
        
      case 'mcp_in_hooks':
        console.log('Problem: MCP coordination calls in hooks');
        console.log('Solution: Move these to agent execution phase');
        console.log('Rationale: Hooks should be lightweight coordination, not heavy orchestration');
        console.log('Consider: Does this agent really need to spawn other agents in its hooks?');
        break;
        
      case 'missing_error_hook':
        console.log('Problem: No error handling in hooks');
        console.log('Solution: Add on_error hook for robustness');
        console.log('Benefit: Prevents hook failures from breaking the agent');
        break;
    }
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  reportResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 INTERACTIVE FIX RESULTS');
    console.log('═'.repeat(60));
    
    console.log(`✅ Fixed: ${this.fixed.length} files`);
    console.log(`⏭️  Skipped: ${this.skipped.length} files`);
    console.log(`❌ Errors: ${this.errors.length} files`);
    
    if (this.fixed.length > 0) {
      console.log('\n📝 FILES FIXED:');
      for (const fix of this.fixed) {
        console.log(`   ${fix.file}:`);
        fix.changes.forEach(change => console.log(`     - ${change}`));
      }
    }
    
    console.log('\n💾 BACKUP INFO:');
    console.log('   Original files backed up with .backup extension');
    console.log('   To restore: for f in **/*.backup; do mv "$f" "${f%.backup}"; done');
  }
}

// Run the interactive fixer
// Get agents directory from command line argument or default
const agentsDir = process.argv[2] || path.join(process.cwd(), '.claude', 'agents');
const fixer = new InteractiveHookFixer(agentsDir);
await fixer.interactiveFixAll();