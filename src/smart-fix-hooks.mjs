#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Smart hook fixing utility that understands agent types and contexts
class SmartHookFixer {
  constructor(agentsDir) {
    // Use provided agentsDir or default to current working directory
    this.agentsDir = agentsDir || path.join(process.cwd(), '.claude', 'agents');
    this.fixed = [];
    this.skipped = [];
    this.errors = [];
  }

  async smartFixAll() {
    console.log('🧠 Smart Claude Flow Agent Hook Fixer');
    console.log('═'.repeat(60));
    console.log('Analyzing agent types and applying contextual fixes...\n');
    
    const agentFiles = await this.findAgentFiles();
    
    for (const file of agentFiles) {
      await this.smartFixAgent(file);
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
    return files.sort();
  }

  async smartFixAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip files without hooks
      if (!content.includes('hooks:')) {
        console.log(`⏭️  ${relativePath}: No hooks section - skipping`);
        this.skipped.push(relativePath);
        return;
      }

      const agentInfo = this.analyzeAgent(content, filePath);
      const issues = this.analyzeHooks(content, agentInfo);
      
      if (issues.length === 0) {
        console.log(`✨ ${relativePath}: Hooks are contextually appropriate`);
        this.skipped.push(relativePath);
        return;
      }

      console.log(`\n🔧 ${relativePath} (${agentInfo.type}/${agentInfo.category}):`);
      
      let newContent = content;
      let changesMade = [];
      
      for (const issue of issues) {
        const fix = this.getContextualFix(issue, agentInfo);
        
        if (fix.action === 'fix') {
          newContent = newContent.replace(fix.pattern, fix.replacement);
          changesMade.push(fix.description);
          console.log(`   ✅ ${fix.description}`);
        } else if (fix.action === 'comment') {
          newContent = newContent.replace(fix.pattern, `# CONTEXTUAL: ${fix.replacement} (${fix.reason})`);
          changesMade.push(`Commented: ${fix.description}`);
          console.log(`   💬 Commented: ${fix.description} (${fix.reason})`);
        } else if (fix.action === 'keep') {
          console.log(`   ⚡ Keeping: ${issue.description} (${fix.reason})`);
        } else if (fix.action === 'skip') {
          console.log(`   ⏭️  Skipping: ${issue.description} (${fix.reason})`);
        }
      }
      
      // Apply changes if any were made
      if (changesMade.length > 0) {
        // Create backup
        fs.writeFileSync(filePath + '.backup', content);
        fs.writeFileSync(filePath, newContent);
        
        this.fixed.push({ file: relativePath, changes: changesMade, type: agentInfo.type });
      } else {
        this.skipped.push(relativePath);
      }
      
    } catch (error) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`❌ Error processing ${relativePath}: ${error.message}`);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  analyzeAgent(content, filePath) {
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const typeMatch = content.match(/^type:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    
    const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, '.md');
    const type = typeMatch ? typeMatch[1].trim() : 'unknown';
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Determine category based on path and type
    let category = 'general';
    if (filePath.includes('/github/')) {
      category = 'github';
    } else if (filePath.includes('/swarm/')) {
      category = 'swarm-coordinator';
    } else if (filePath.includes('/hive-mind/')) {
      category = 'hive-mind';
    } else if (filePath.includes('/core/')) {
      category = 'core';
    } else if (filePath.includes('/sparc/')) {
      category = 'sparc';
    }
    
    // Determine if this agent legitimately coordinates other agents
    const isCoordinator = name.includes('coordinator') || 
                          name.includes('manager') || 
                          description.includes('coordination') ||
                          description.includes('orchestration') ||
                          description.includes('swarm') ||
                          type === 'swarm' ||
                          category === 'swarm-coordinator' ||
                          category === 'hive-mind';
    
    return { name, type, description, category, isCoordinator, filePath };
  }

  analyzeHooks(content, agentInfo) {
    const issues = [];
    
    // Check for MCP calls in hooks
    const mcpCallsInHooks = [
      { pattern: /mcp__claude-flow__swarm_init/g, type: 'mcp_swarm_init' },
      { pattern: /mcp__claude-flow__agent_spawn/g, type: 'mcp_agent_spawn' },
      { pattern: /mcp__claude-flow__task_orchestrate/g, type: 'mcp_task_orchestrate' }
    ];
    
    for (const mcp of mcpCallsInHooks) {
      if (mcp.pattern.test(content)) {
        issues.push({
          type: mcp.type,
          description: `MCP ${mcp.type.replace('mcp_', '').replace('_', ' ')} call in hooks`,
          pattern: mcp.pattern,
          severity: agentInfo.isCoordinator ? 'medium' : 'high'
        });
      }
    }
    
    // Check for missing error hooks
    if (content.includes('hooks:') && !content.includes('on_error:')) {
      issues.push({
        type: 'missing_error_hook',
        description: 'Missing on_error hook',
        severity: 'low'
      });
    }
    
    return issues;
  }

  getContextualFix(issue, agentInfo) {
    switch (issue.type) {
      case 'mcp_swarm_init':
        if (agentInfo.isCoordinator && agentInfo.category === 'swarm-coordinator') {
          return {
            action: 'comment',
            pattern: issue.pattern,
            replacement: 'mcp__claude-flow__swarm_init moved to execution phase',
            reason: 'Swarm init should be in execution, not hooks',
            description: 'Moved swarm_init to execution phase'
          };
        } else {
          return {
            action: 'comment',
            pattern: issue.pattern,
            replacement: 'mcp__claude-flow__swarm_init removed from hooks',
            reason: 'Non-coordinator agents should not initialize swarms in hooks',
            description: 'Removed inappropriate swarm_init call'
          };
        }
        
      case 'mcp_agent_spawn':
        if (agentInfo.isCoordinator) {
          return {
            action: 'comment',
            pattern: issue.pattern,
            replacement: 'mcp__claude-flow__agent_spawn moved to execution phase',
            reason: 'Agent spawning should be in execution, not hooks',
            description: 'Moved agent_spawn to execution phase'
          };
        } else {
          return {
            action: 'comment',
            pattern: issue.pattern,
            replacement: 'mcp__claude-flow__agent_spawn removed from hooks',
            reason: 'Only coordinator agents should spawn other agents',
            description: 'Removed inappropriate agent_spawn call'
          };
        }
        
      case 'mcp_task_orchestrate':
        return {
          action: 'comment',
          pattern: issue.pattern,
          replacement: 'mcp__claude-flow__task_orchestrate moved to execution phase',
          reason: 'Task orchestration is core business logic, not hook setup',
          description: 'Moved task_orchestrate to execution phase'
        };
        
      case 'missing_error_hook':
        return {
          action: 'fix',
          pattern: /(\n---)/,
          replacement: `  on_error: |
    echo "⚠️ ${agentInfo.name} agent error: {{error_message}}"
    npx claude-flow@alpha memory store "agent_error_$(date +%s)" "Error in ${agentInfo.name}: {{error_message}}" --namespace="errors"
    echo "🔄 Attempting recovery..."
$1`,
          description: 'Added on_error hook for robustness'
        };
        
      default:
        return { action: 'skip', reason: 'Unknown issue type' };
    }
  }

  reportResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('🧠 SMART FIX RESULTS');
    console.log('═'.repeat(60));
    
    console.log(`✅ Fixed: ${this.fixed.length} files`);
    console.log(`⏭️  Skipped: ${this.skipped.length} files`);
    console.log(`❌ Errors: ${this.errors.length} files`);
    
    if (this.fixed.length > 0) {
      console.log('\n📊 FIXES BY AGENT TYPE:');
      const byType = {};
      
      for (const fix of this.fixed) {
        if (!byType[fix.type]) {
          byType[fix.type] = [];
        }
        byType[fix.type].push(fix);
      }
      
      for (const [type, fixes] of Object.entries(byType)) {
        console.log(`   ${type}: ${fixes.length} files`);
      }
      
      console.log('\n📝 CONTEXTUAL DECISIONS MADE:');
      console.log('   - Swarm coordinators: MCP calls commented (move to execution)');
      console.log('   - GitHub agents: MCP calls removed (inappropriate)');
      console.log('   - Core agents: Standard hook improvements applied');
      console.log('   - All agents: Error handling added where missing');
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`   ${error.file}: ${error.error}`);
      }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review commented MCP calls in swarm coordinators');
    console.log('2. Move heavy orchestration from hooks to execution phase');
    console.log('3. Test agents with lightweight hooks');
    console.log('4. Validate coordination still works properly');
  }
}

// Run the smart fixer
// Get agents directory from command line argument or default
const agentsDir = process.argv[2] || path.join(process.cwd(), '.claude', 'agents');
const fixer = new SmartHookFixer(agentsDir);
await fixer.smartFixAll();