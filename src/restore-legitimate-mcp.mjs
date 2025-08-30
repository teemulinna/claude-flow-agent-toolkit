#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tool to restore legitimate MCP usage that was incorrectly commented out
class MCPRestorer {
  constructor(agentsDir) {
    this.agentsDir = agentsDir || path.join(process.cwd(), '.claude', 'agents');
    this.restored = [];
    this.errors = [];
  }

  async restoreLegitimateUsage() {
    console.log('🔄 Restoring Legitimate MCP Usage');
    console.log('═'.repeat(60));
    console.log('Analyzing commented MCP calls and restoring valid usage...\n');
    
    const agentFiles = await this.findAgentFiles();
    
    for (const file of agentFiles) {
      await this.restoreAgent(file);
    }
    
    this.reportResults();
  }

  async findAgentFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          walkDir(fullPath);
        } else if (item.endsWith('.md') && !item.startsWith('README')) {
          files.push(fullPath);
        }
      }
    };
    
    walkDir(this.agentsDir);
    return files.sort();
  }

  async restoreAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip files without commented MCP calls
      if (!content.includes('# CONTEXTUAL:')) {
        return;
      }

      console.log(`\n🔄 ${relativePath}:`);
      
      let newContent = content;
      let changesMade = [];
      
      // Restore legitimate MCP usage in tools section
      const toolsRestorations = [
        {
          pattern: /- # CONTEXTUAL: [^\\n]* (mcp__claude-flow__swarm_init)/g,
          replacement: '    - $1',
          description: 'Restored swarm_init in tools'
        },
        {
          pattern: /- # CONTEXTUAL: [^\\n]* (mcp__claude-flow__agent_spawn)/g,
          replacement: '    - $1',
          description: 'Restored agent_spawn in tools'  
        },
        {
          pattern: /- # CONTEXTUAL: [^\\n]* (mcp__claude-flow__task_orchestrate)/g,
          replacement: '    - $1',
          description: 'Restored task_orchestrate in tools'
        }
      ];
      
      for (const restoration of toolsRestorations) {
        if (restoration.pattern.test(newContent)) {
          newContent = newContent.replace(restoration.pattern, restoration.replacement);
          changesMade.push(restoration.description);
          console.log(`   ✅ ${restoration.description}`);
        }
      }
      
      // Restore legitimate usage examples (not in hooks)
      const exampleRestorations = [
        {
          pattern: /# CONTEXTUAL: [^\\n]* (mcp__claude-flow__swarm_init [^\\n]*)/g,
          replacement: '$1',
          description: 'Restored swarm_init in usage examples'
        },
        {
          pattern: /# CONTEXTUAL: [^\\n]* (mcp__claude-flow__agent_spawn [^\\n]*)/g,
          replacement: '$1', 
          description: 'Restored agent_spawn in usage examples'
        },
        {
          pattern: /# CONTEXTUAL: [^\\n]* (mcp__claude-flow__task_orchestrate [^\\n]*)/g,
          replacement: '$1',
          description: 'Restored task_orchestrate in usage examples'
        }
      ];
      
      for (const restoration of exampleRestorations) {
        const matches = [...newContent.matchAll(restoration.pattern)];
        if (matches.length > 0) {
          // Only restore if it's NOT in hooks section
          for (const match of matches) {
            const beforeMatch = newContent.substring(0, match.index);
            const isInHooks = beforeMatch.lastIndexOf('hooks:') > beforeMatch.lastIndexOf('---');
            
            if (!isInHooks) {
              newContent = newContent.replace(match[0], restoration.replacement);
              if (!changesMade.includes(restoration.description)) {
                changesMade.push(restoration.description);
                console.log(`   ✅ ${restoration.description}`);
              }
            }
          }
        }
      }
      
      // Apply changes if any were made
      if (changesMade.length > 0) {
        fs.writeFileSync(filePath, newContent);
        this.restored.push({ file: relativePath, changes: changesMade });
      }
      
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`❌ Error processing ${relativePath}: ${error.message}`);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  reportResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('🔄 MCP RESTORATION RESULTS');
    console.log('═'.repeat(60));
    
    console.log(`✅ Restored: ${this.restored.length} files`);
    console.log(`❌ Errors: ${this.errors.length} files`);
    
    if (this.restored.length > 0) {
      console.log('\n📝 RESTORATIONS MADE:');
      const changeTypes = {};
      
      for (const restore of this.restored) {
        for (const change of restore.changes) {
          changeTypes[change] = (changeTypes[change] || 0) + 1;
        }
      }
      
      for (const [change, count] of Object.entries(changeTypes)) {
        console.log(`   ${change}: ${count} files`);
      }
      
      console.log('\n🎯 WHAT WAS PRESERVED:');
      console.log('   ✅ Legitimate MCP tools in tools sections');
      console.log('   ✅ Valid coordination examples in documentation');
      console.log('   ✅ Proper usage patterns for agent coordination');
      console.log('   ✅ Agent orchestration capabilities maintained');
    }
    
    console.log('\n💡 RESULT:');
    console.log('   Agents now have legitimate coordination capabilities preserved');
    console.log('   while maintaining lightweight, proper hook configurations.');
  }
}

// Run the MCP restorer
const agentsDir = process.argv[2] || path.join(process.cwd(), '.claude', 'agents');
const restorer = new MCPRestorer(agentsDir);
await restorer.restoreLegitimateUsage();