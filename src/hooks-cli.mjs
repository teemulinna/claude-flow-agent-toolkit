#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

program
  .name('claude-flow-hooks')
  .description('Claude Flow Agent Hook Management CLI - Validate, fix, and manage agent hooks')
  .version(packageJson.version);

// Validate hooks command
program
  .command('validate')
  .description('Validate all agent hook configurations')
  .option('-v, --verbose', 'Show detailed validation results')
  .action(async (options) => {
    const spinner = ora('Validating agent hooks...').start();
    
    try {
      const fixHooksPath = path.join(__dirname, 'fix-hooks.mjs');
      const result = execSync(`node "${fixHooksPath}"`, { 
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      spinner.succeed('Hook validation completed');
      
      if (options.verbose) {
        console.log(result);
      } else {
        // Show summary only
        const lines = result.split('\n');
        const summaryStart = lines.findIndex(line => line.includes('HOOK VALIDATION SUMMARY'));
        if (summaryStart !== -1) {
          console.log('\n' + lines.slice(summaryStart).join('\n'));
        }
      }
    } catch (error) {
      spinner.fail('Hook validation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Auto-fix command
program
  .command('auto-fix')
  .description('Automatically fix common hook issues')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .action(async (options) => {
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry run mode - no changes will be made\n'));
    }
    
    const spinner = ora('Auto-fixing agent hooks...').start();
    
    try {
      const fixHooksPath = path.join(__dirname, 'fix-hooks.mjs');
      const autoFixPath = path.join(__dirname, 'auto-fix-hooks.mjs');
      const command = options.dryRun ? `node "${fixHooksPath}"` : `node "${autoFixPath}"`;
      const result = execSync(command, { 
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      spinner.succeed(options.dryRun ? 'Dry run completed' : 'Auto-fix completed');
      console.log(result);
    } catch (error) {
      spinner.fail('Auto-fix failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Smart-fix command  
program
  .command('smart-fix')
  .description('Apply context-aware intelligent fixes to agent hooks')
  .option('--verbose', 'Show detailed contextual decisions')
  .action(async (options) => {
    const spinner = ora('Running smart contextual fixes...').start();
    
    try {
      const smartFixPath = path.join(__dirname, 'smart-fix-hooks.mjs');
      const result = execSync(`node "${smartFixPath}"`, { 
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      spinner.succeed('Smart-fix completed');
      console.log(result);
    } catch (error) {
      spinner.fail('Smart-fix failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive')
  .description('Interactively fix agent hooks with guided approval')
  .action(async () => {
    console.log(chalk.blue('🎯 Starting interactive hook fixing...'));
    console.log(chalk.gray('This will guide you through fixing each agent individually.\n'));
    
    try {
      const interactivePath = path.join(__dirname, 'interactive-fix-hooks.mjs');
      execSync(`node "${interactivePath}"`, { 
        cwd: process.cwd(),
        stdio: 'inherit'
      });
    } catch (error) {
      console.error(chalk.red('Interactive fix failed:'), error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current hook system status and statistics')
  .action(async () => {
    const spinner = ora('Gathering hook system status...').start();
    
    try {
      const fixHooksPath = path.join(__dirname, 'fix-hooks.mjs');
      const result = execSync(`node "${fixHooksPath}"`, { 
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      spinner.succeed('Status gathered');
      
      // Extract and display summary statistics
      const lines = result.split('\n');
      const summaryStart = lines.findIndex(line => line.includes('HOOK VALIDATION SUMMARY'));
      
      if (summaryStart !== -1) {
        const summaryLines = lines.slice(summaryStart);
        console.log('\n' + chalk.bold('📊 HOOK SYSTEM STATUS'));
        console.log('─'.repeat(50));
        
        // Extract key metrics
        const validFiles = result.match(/✅[^:]+: Hooks are valid/g)?.length || 0;
        const issueFiles = result.match(/❌[^:]+:/g)?.length || 0;
        const totalFiles = validFiles + issueFiles;
        
        console.log(chalk.green(`✅ Valid hooks: ${validFiles} files`));
        console.log(chalk.yellow(`⚠️  Files with issues: ${issueFiles} files`));
        console.log(chalk.blue(`📁 Total agents: ${totalFiles} files`));
        
        const successRate = totalFiles > 0 ? ((validFiles / totalFiles) * 100).toFixed(1) : 0;
        console.log(chalk.bold(`🎯 Success rate: ${successRate}%`));
        
        if (issueFiles > 0) {
          console.log(chalk.gray('\nRun with --verbose to see detailed issues'));
        }
      }
    } catch (error) {
      spinner.fail('Status check failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore')
  .description('Restore agent files from backups')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.confirm) {
      console.log(chalk.yellow('⚠️  This will restore all agent files from .backup files'));
      console.log(chalk.gray('Use --confirm to skip this prompt\n'));
      
      const { execSync } = await import('child_process');
      try {
        execSync('read -p "Continue? (y/N): " confirm && [ "$confirm" = "y" ]', {
          stdio: 'inherit',
          shell: '/bin/bash'
        });
      } catch {
        console.log(chalk.gray('Cancelled'));
        return;
      }
    }
    
    const spinner = ora('Restoring agent files from backups...').start();
    
    try {
      const result = execSync('find .claude/agents -name "*.backup" -exec sh -c \'mv "$1" "${1%.backup}"\' _ {} \\;', {
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      const backupCount = execSync('find .claude/agents -name "*.backup" 2>/dev/null | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      }).trim();
      
      spinner.succeed(`Restored files from backups (${backupCount} backups processed)`);
      console.log(chalk.blue('💡 Run claude-flow-hooks validate to check status after restore'));
    } catch (error) {
      spinner.fail('Restore failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Help command with examples
program
  .command('help-examples')
  .description('Show usage examples and common workflows')
  .action(() => {
    console.log(chalk.bold('\n🎯 CLAUDE FLOW HOOKS CLI - USAGE EXAMPLES\n'));
    
    console.log(chalk.blue('📋 Common Workflows:\n'));
    
    console.log(chalk.bold('1. Initial Setup & Validation:'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks validate'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks status\n'));
    
    console.log(chalk.bold('2. Fix Issues Automatically:'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks auto-fix'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks smart-fix\n'));
    
    console.log(chalk.bold('3. Interactive Guided Fixing:'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks interactive\n'));
    
    console.log(chalk.bold('4. Safety & Recovery:'));
    console.log(chalk.gray('   npx @aigentics/agent-toolkit claude-flow-hooks restore'));
    console.log(chalk.gray('   # Restores from .backup files if needed\n'));
    
    console.log(chalk.blue('🔧 Development Workflow:\n'));
    console.log(chalk.gray('1. Validate: claude-flow-hooks validate'));
    console.log(chalk.gray('2. Auto-fix: claude-flow-hooks auto-fix'));
    console.log(chalk.gray('3. Smart-fix: claude-flow-hooks smart-fix'));
    console.log(chalk.gray('4. Verify: claude-flow-hooks status'));
    console.log(chalk.gray('5. Test: Run your agents with Claude Code'));
    
    console.log(chalk.blue('\n💡 Tips:'));
    console.log(chalk.gray('- All fixes create .backup files automatically'));
    console.log(chalk.gray('- Smart-fix makes contextual decisions based on agent type'));
    console.log(chalk.gray('- Interactive mode lets you approve each change'));
    console.log(chalk.gray('- Status shows quick overview of hook system health'));
  });

program.parse();