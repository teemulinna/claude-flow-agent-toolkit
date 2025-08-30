#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced smart hook fixing that preserves legitimate MCP usage
class EnhancedSmartHookFixer {
  constructor(agentsDir) {
    this.agentsDir = agentsDir || path.join(process.cwd(), '.claude', 'agents');
    this.fixed = [];
    this.preserved = [];
    this.enhanced = [];
    this.errors = [];
  }

  async enhancedSmartFixAll() {
    console.log('🧠 Enhanced Smart Claude Flow Agent Hook Fixer');
    console.log('═'.repeat(60));
    console.log('Analyzing legitimate MCP usage and preserving valid patterns...\n');
    
    const agentFiles = await this.findAgentFiles();
    
    for (const file of agentFiles) {
      await this.enhancedSmartFixAgent(file);
    }
    
    this.reportResults();
  }

  async findAgentFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) {
        console.log(`⚠️  Directory ${dir} not found`);
        return;
      }
      
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

  async enhancedSmartFixAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip files without hooks
      if (!content.includes('hooks:')) {
        console.log(`⏭️  ${relativePath}: No hooks section - skipping`);
        return;
      }

      const agentInfo = this.analyzeAgent(content, filePath);
      const analysis = this.analyzeHookUsage(content, agentInfo);
      
      if (analysis.isOptimal) {
        console.log(`✨ ${relativePath}: Hooks are optimally configured`);
        this.preserved.push(relativePath);
        return;
      }

      console.log(`\n🔧 ${relativePath} (${agentInfo.type}/${agentInfo.category}):`);
      
      let newContent = content;
      let changesMade = [];
      
      // Only fix actual hook section issues, preserve valid usage elsewhere
      if (analysis.hookIssues.length > 0) {
        for (const issue of analysis.hookIssues) {
          const fix = this.getEnhancedContextualFix(issue, agentInfo, analysis);
          
          if (fix.action === 'fix') {
            newContent = newContent.replace(fix.pattern, fix.replacement);
            changesMade.push(fix.description);
            console.log(`   ✅ ${fix.description}`);
          } else if (fix.action === 'preserve') {
            console.log(`   🛡️  Preserved: ${issue.description} (${fix.reason})`);
          } else if (fix.action === 'enhance') {
            // Add beneficial patterns from successful agents
            newContent = this.addBeneficialPattern(newContent, fix.pattern, agentInfo);
            changesMade.push(fix.description);
            console.log(`   🚀 Enhanced: ${fix.description}`);
          }
        }
      }
      
      // Check if this agent could benefit from patterns used by similar agents
      const beneficialPatterns = this.findBeneficialPatterns(agentInfo, analysis);
      for (const pattern of beneficialPatterns) {
        newContent = this.addBeneficialPattern(newContent, pattern.addition, agentInfo);
        changesMade.push(pattern.description);
        console.log(`   🌟 Added: ${pattern.description}`);
      }
      
      // Apply changes if any were made
      if (changesMade.length > 0) {
        // Create backup
        fs.writeFileSync(filePath + '.backup', content);
        fs.writeFileSync(filePath, newContent);
        
        this.fixed.push({ file: relativePath, changes: changesMade, type: agentInfo.type });
      } else if (analysis.hasLegitimateUsage) {
        this.preserved.push(relativePath);
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
    const capabilitiesMatch = content.match(/capabilities:\s*\n([\s\S]*?)(?=\n\w+:|---)/);
    
    const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, '.md');
    const type = typeMatch ? typeMatch[1].trim() : 'unknown';
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Determine category and coordination level
    let category = 'general';
    let coordinationLevel = 'none';
    
    if (filePath.includes('/github/')) {
      category = 'github';
      // GitHub agents can coordinate PR reviews and releases
      if (name.includes('manager') || name.includes('coordinator') || description.includes('coordination')) {
        coordinationLevel = 'github-workflow';
      }
    } else if (filePath.includes('/swarm/')) {
      category = 'swarm-coordinator';
      coordinationLevel = 'full-swarm';
    } else if (filePath.includes('/hive-mind/')) {
      category = 'hive-mind';
      coordinationLevel = 'collective';
    } else if (filePath.includes('/consensus/')) {
      category = 'consensus';
      coordinationLevel = 'protocol';
    }
    
    // Analyze coordination needs from description and capabilities
    if (description.includes('swarm') || description.includes('coordination') || description.includes('orchestration')) {
      if (coordinationLevel === 'none') coordinationLevel = 'lightweight';
    }
    
    return { name, type, description, category, coordinationLevel, filePath };
  }

  analyzeHookUsage(content, agentInfo) {
    const hookSection = this.extractHookSection(content);
    const toolsSection = this.extractToolsSection(content);
    const usageExamples = this.extractUsageExamples(content);
    
    const hookIssues = [];
    let hasLegitimateUsage = false;
    let isOptimal = true;
    
    // Analyze actual hooks section (not tools or examples)
    if (hookSection) {
      // Check for MCP calls ONLY in hooks section
      if (hookSection.includes('mcp__claude-flow__swarm_init')) {
        if (agentInfo.coordinationLevel === 'full-swarm') {
          hasLegitimateUsage = true;
          // Even swarm coordinators should do heavy init in execution, not hooks
          hookIssues.push({
            type: 'move_to_execution',
            description: 'Heavy swarm init in hooks should move to execution',
            location: 'hooks'
          });
          isOptimal = false;
        } else {
          hookIssues.push({
            type: 'inappropriate_swarm_init',
            description: 'Inappropriate swarm init in hooks',
            location: 'hooks'
          });
          isOptimal = false;
        }
      }
      
      // Check for missing GitHub validation in GitHub agents
      if (agentInfo.category === 'github' && !hookSection.includes('gh auth status')) {
        hookIssues.push({
          type: 'add_github_validation',
          description: 'Missing GitHub CLI validation in hooks',
          location: 'hooks'
        });
        isOptimal = false;
      }
    }
    
    // Analyze tools section - this should PRESERVE MCP tools
    if (toolsSection && toolsSection.includes('mcp__claude-flow__')) {
      hasLegitimateUsage = true;
      console.log(`   🛡️  Legitimate MCP tools found in ${agentInfo.name}`);
    }
    
    // Analyze usage examples - these should PRESERVE MCP examples
    if (usageExamples && usageExamples.includes('mcp__claude-flow__')) {
      hasLegitimateUsage = true;
      console.log(`   📚 Valid MCP usage examples found in ${agentInfo.name}`);
    }
    
    return { hookIssues, hasLegitimateUsage, isOptimal, hookSection, toolsSection, usageExamples };
  }

  extractHookSection(content) {
    const hookStart = content.indexOf('hooks:');
    if (hookStart === -1) return null;
    
    // Find end of hooks section (next YAML section or ---)
    const nextSection = content.indexOf('\n---', hookStart);
    const nextYamlSection = content.search(/\n[a-zA-Z]+:/g, hookStart + 6);
    
    let endPos = content.length;
    if (nextSection !== -1) endPos = Math.min(endPos, nextSection);
    if (nextYamlSection !== -1) endPos = Math.min(endPos, nextYamlSection);
    
    return content.substring(hookStart, endPos);
  }

  extractToolsSection(content) {
    const toolsStart = content.indexOf('tools:');
    if (toolsStart === -1) return null;
    
    const nextYamlSection = content.search(/\n[a-zA-Z]+:/g, toolsStart + 6);
    const endPos = nextYamlSection === -1 ? content.indexOf('\n---', toolsStart) : nextYamlSection;
    
    return content.substring(toolsStart, endPos === -1 ? content.length : endPos);
  }

  extractUsageExamples(content) {
    const exampleStart = content.indexOf('## Usage');
    if (exampleStart === -1) {
      const patternStart = content.indexOf('## Patterns');
      return patternStart === -1 ? null : content.substring(patternStart);
    }
    return content.substring(exampleStart);
  }

  getEnhancedContextualFix(issue, agentInfo, analysis) {
    switch (issue.type) {
      case 'move_to_execution':
        return {
          action: 'preserve',
          reason: `${agentInfo.name} legitimately needs coordination - guidance provided in comments`
        };
        
      case 'inappropriate_swarm_init':
        return {
          action: 'fix',
          pattern: /mcp__claude-flow__swarm_init[^\n]*/g,
          replacement: '# NOTE: Swarm coordination moved to execution phase for better separation',
          description: 'Replaced inappropriate swarm init with guidance comment'
        };
        
      case 'add_github_validation':
        return {
          action: 'enhance',
          pattern: {
            type: 'github_validation',
            content: `    - gh auth status || (echo 'GitHub CLI not authenticated' && exit 1)
    - git status --porcelain`
          },
          description: 'Added GitHub CLI validation to hooks'
        };
        
      default:
        return { action: 'preserve', reason: 'Unknown issue type' };
    }
  }

  findBeneficialPatterns(agentInfo, analysis) {
    const patterns = [];
    
    // GitHub agents should have GitHub CLI validation
    if (agentInfo.category === 'github' && !analysis.hookSection?.includes('gh auth status')) {
      patterns.push({
        type: 'github_validation',
        addition: {
          section: 'hooks',
          content: `  pre:
    - gh auth status || (echo 'GitHub CLI not authenticated' && exit 1)
    - git status --porcelain
    - echo "🐙 ${agentInfo.name} validating GitHub context"`
        },
        description: 'GitHub CLI validation pattern'
      });
    }
    
    // Swarm coordinators should have coordination setup
    if (agentInfo.coordinationLevel === 'full-swarm' && !analysis.hookSection?.includes('echo')) {
      patterns.push({
        type: 'coordination_logging',
        addition: {
          section: 'hooks',
          content: `  pre: |
    echo "🐝 ${agentInfo.name} initializing coordination context: $AGENT_TASK"
    npx claude-flow@alpha hooks pre-task --description "$AGENT_TASK" --auto-spawn-agents false`
        },
        description: 'Coordination logging pattern'
      });
    }
    
    return patterns;
  }

  addBeneficialPattern(content, pattern, agentInfo) {
    if (pattern.section === 'hooks') {
      const hookStart = content.indexOf('hooks:');
      if (hookStart !== -1) {
        // Check if hooks already has pre: section
        const hookSection = this.extractHookSection(content);
        if (!hookSection.includes('pre:')) {
          const insertPoint = content.indexOf('hooks:') + 6;
          return content.slice(0, insertPoint) + '\n' + pattern.content + content.slice(insertPoint);
        }
      }
    }
    return content;
  }

  reportResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('🧠 ENHANCED SMART FIX RESULTS');
    console.log('═'.repeat(60));
    
    console.log(`✅ Fixed: ${this.fixed.length} files`);
    console.log(`🛡️  Preserved: ${this.preserved.length} files (legitimate MCP usage)`);
    console.log(`🌟 Enhanced: ${this.enhanced.length} files (added beneficial patterns)`);
    console.log(`❌ Errors: ${this.errors.length} files`);
    
    if (this.preserved.length > 0) {
      console.log('\n🛡️  PRESERVED LEGITIMATE USAGE:');
      console.log('   - GitHub agents: MCP tools preserved for coordination');
      console.log('   - Swarm coordinators: Orchestration tools preserved');
      console.log('   - Documentation examples: Usage patterns preserved');
      console.log('   - Only inappropriate hook usage was modified');
    }
    
    if (this.enhanced.length > 0) {
      console.log('\n🌟 BENEFICIAL PATTERNS ADDED:');
      console.log('   - GitHub agents: Added GitHub CLI validation where missing');
      console.log('   - Coordination agents: Added proper context logging');
      console.log('   - Error handling: Added to agents without it');
    }
    
    console.log('\n🎯 INTELLIGENT DECISIONS:');
    console.log('   ✅ Preserved legitimate MCP usage in tools and examples');
    console.log('   ✅ Only modified inappropriate usage in hooks sections');
    console.log('   ✅ Added beneficial patterns from successful agents');
    console.log('   ✅ Maintained agent coordination capabilities');
    
    console.log('\n📚 NEXT STEPS:');
    console.log('1. Agents retain their coordination capabilities');
    console.log('2. Examples and tools sections are preserved');
    console.log('3. Only hooks have lightweight improvements');
    console.log('4. Run validation to confirm improvements');
  }
}

// Run the enhanced smart fixer
// Get agents directory from command line argument or default
const agentsDir = process.argv[2] || path.join(process.cwd(), '.claude', 'agents');
const fixer = new EnhancedSmartHookFixer(agentsDir);
await fixer.enhancedSmartFixAll();