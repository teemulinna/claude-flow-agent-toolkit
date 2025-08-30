#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hook validation and fixing utility for Claude Flow agents
class HookFixer {
  constructor(agentsDir) {
    // Use provided agentsDir or default to current working directory
    this.agentsDir = agentsDir || path.join(process.cwd(), '.claude', 'agents');
    this.issues = [];
    this.fixed = [];
  }

  async analyzeAndFix() {
    console.log('🔍 Analyzing Claude Flow agent hook configurations...\n');
    
    const agentFiles = await this.findAgentFiles();
    
    for (const file of agentFiles) {
      await this.processAgentFile(file);
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
        } else if (item.endsWith('.md') && !item.startsWith('README')) {
          files.push(fullPath);
        }
      }
    };
    
    walkDir(this.agentsDir);
    return files;
  }

  async processAgentFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Check if file has hooks section
      if (!content.includes('hooks:')) {
        console.log(`⚠️  ${relativePath}: No hooks section found`);
        return;
      }

      const issues = this.validateHooks(content, relativePath);
      
      if (issues.length > 0) {
        this.issues.push({ file: relativePath, issues });
        console.log(`❌ ${relativePath}:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log(`✅ ${relativePath}: Hooks are valid`);
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }

  validateHooks(content, filePath) {
    const issues = [];
    
    // Check for undefined functions
    const undefinedFunctions = [
      'memory_store',
      'memory_search',
      'memory_retrieve'
    ];
    
    for (const func of undefinedFunctions) {
      if (content.includes(func + ' ')) {
        issues.push(`Undefined function: ${func} (use: npx claude-flow@alpha memory)`);
      }
    }
    
    // Check for undefined variables
    const undefinedVars = [
      '${TASK_ID}',
      '${SWARM_ID}',
      '${AGENT_ID}'
    ];
    
    for (const variable of undefinedVars) {
      if (content.includes(variable)) {
        issues.push(`Undefined variable: ${variable} (use: $AGENT_TASK)`);
      }
    }
    
    // Check for direct MCP calls in hooks (should be limited)
    const problematicMCPCalls = [
      'mcp__claude-flow__swarm_init',
      'mcp__claude-flow__agent_spawn',
      'mcp__claude-flow__task_orchestrate'
    ];
    
    for (const call of problematicMCPCalls) {
      if (content.includes(call)) {
        issues.push(`MCP call in hooks: ${call} (should be in agent execution, not hooks)`);
      }
    }
    
    // Check hook structure
    if (content.includes('hooks:')) {
      const hookSection = this.extractHookSection(content);
      
      if (!hookSection.includes('pre:')) {
        issues.push('Missing pre: hook (recommended)');
      }
      
      if (!hookSection.includes('post:')) {
        issues.push('Missing post: hook (recommended)');
      }
      
      // Check for proper error handling
      if (!hookSection.includes('on_error:')) {
        issues.push('Missing on_error: hook (recommended for robustness)');
      }
    }
    
    return issues;
  }

  extractHookSection(content) {
    const hookStart = content.indexOf('hooks:');
    if (hookStart === -1) return '';
    
    const nextSection = content.indexOf('\n---', hookStart);
    const endPos = nextSection === -1 ? content.length : nextSection;
    
    return content.substring(hookStart, endPos);
  }

  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HOOK VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('✅ All agent hooks are valid!');
    } else {
      console.log(`❌ Found issues in ${this.issues.length} files:`);
      console.log('');
      
      // Group issues by type
      const issueTypes = {};
      
      for (const fileIssue of this.issues) {
        for (const issue of fileIssue.issues) {
          if (!issueTypes[issue]) {
            issueTypes[issue] = [];
          }
          issueTypes[issue].push(fileIssue.file);
        }
      }
      
      for (const [issue, files] of Object.entries(issueTypes)) {
        console.log(`🔸 ${issue}`);
        console.log(`   Affected files: ${files.length}`);
        if (files.length <= 3) {
          files.forEach(file => console.log(`     - ${file}`));
        } else {
          files.slice(0, 3).forEach(file => console.log(`     - ${file}`));
          console.log(`     ... and ${files.length - 3} more`);
        }
        console.log('');
      }
    }
    
    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('1. Review HOOK_SYSTEM_ANALYSIS.md for detailed analysis');
    console.log('2. Use .claude/agents/_templates/standard-hook-template.md as reference');
    console.log('3. Update problematic agent configurations');
    console.log('4. Test hooks with: npm run validate');
    console.log('');
  }
}

// Run the analysis
// Get agents directory from command line argument or default
const agentsDir = process.argv[2] || path.join(process.cwd(), '.claude', 'agents');
const fixer = new HookFixer(agentsDir);
await fixer.analyzeAndFix();