#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { validator, fixer, analyzer, creator } from './index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

program
  .name('agent-toolkit')
  .description('Claude Flow Agent Toolkit - Validate, fix, and manage your agent system')
  .version(packageJson.version);

// Validate command
program
  .command('validate [agent-name]')
  .description('Validate agents against Claude Flow v2 standards')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .action(async (agentName, options) => {
    const spinner = ora('Validating agents...').start();
    
    try {
      let results;
      
      if (agentName && agentName !== '*') {
        // Validate specific agent
        const result = await validator.validateFile(
          join(process.cwd(), '.claude', 'agents', `${agentName}.md`)
        );
        results = { 
          total: 1,
          valid: result.status === 'valid' ? 1 : 0,
          warnings: result.status === 'warning' ? 1 : 0,
          errors: result.status === 'error' ? 1 : 0,
          details: [result]
        };
      } else {
        // Validate all agents
        results = await validator.validateAll();
      }
      
      spinner.stop();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        let hasErrors = false;
        
        if (results.details) {
          const report = validator.generateReport(results, 'text');
          console.log(report);
        } else {
          for (const result of results.details || []) {
            if (result.status === 'valid') {
              console.log(chalk.green(`✓ ${result.agent_name}`));
            } else {
              hasErrors = true;
              console.log(chalk.red(`✗ ${result.agent_name}`));
              result.errors.forEach(error => {
                console.log(chalk.red(`  - ${error}`));
              });
            }
          }
        }
        
        console.log();
        if (hasErrors) {
          console.log(chalk.red(`${results.details ? results.details.filter(r => r.status === 'error').length : results.errors || 0} validation errors found`));
          process.exit(1);
        } else {
          console.log(chalk.green('All agents are valid!'));
        }
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Fix command
program
  .command('fix [agent-name]')
  .description('Automatically fix common agent issues')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--all', 'Fix all agents')
  .action(async (agentName, options) => {
    const spinner = ora('Fixing agents...').start();
    
    try {
      let results;
      
      if (options.all || agentName === '*') {
        results = await fixer.fixAll({ dryRun: options.dryRun });
      } else if (agentName) {
        const result = await fixer.fixFile(
          join(process.cwd(), '.claude', 'agents', `${agentName}.md`),
          { dryRun: options.dryRun }
        );
        results = { 
          total: 1,
          fixed: result.fixed ? 1 : 0,
          skipped: !result.fixed && !result.error ? 1 : 0,
          errors: result.error ? 1 : 0,
          details: [result]
        };
      } else {
        spinner.stop();
        console.error(chalk.red('Please specify an agent name or use --all'));
        process.exit(1);
      }
      
      spinner.stop();
      
      const fixed = results.details ? results.details.filter(r => r.fixed).length : results.fixed || 0;
      const wouldFix = results.details ? results.details.filter(r => r.fixes && r.fixes.length > 0).length : 0;
      
      if (options.dryRun) {
        console.log(chalk.yellow(`Would fix ${wouldFix} agents`));
      } else {
        console.log(chalk.green(`Fixed ${fixed} agents`));
      }
      
      if (results.details) {
        results.details.forEach(result => {
          if (result.fixed || (result.fixes && result.fixes.length > 0)) {
            const prefix = options.dryRun ? 'Would fix' : 'Fixed';
            console.log(chalk.green(`${prefix} ${result.relativePath}:`));
            if (result.fixes) {
              result.fixes.forEach(fix => {
                console.log(`  - ${fix}`);
              });
            }
          }
        });
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze your agent system and generate reports')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-o, --output <file>', 'Save output to file')
  .action(async (options) => {
    const spinner = ora('Analyzing agent system...').start();
    
    try {
      const analysis = await analyzer.analyze(process.cwd());
      spinner.stop();
      
      const report = analyzer.generateReport(analysis, options.format);
      
      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, report);
        console.log(chalk.green(`Report saved to ${options.output}`));
      } else {
        console.log(report);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Create command
program
  .command('create <agent-name>')
  .description('Create a new agent from template')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-p, --prompt <prompt>', 'Create agent from natural language prompt')
  .option('--capabilities <capabilities>', 'Comma-separated list of capabilities')
  .option('--tools <tools>', 'Comma-separated list of tools')
  .option('--force', 'Overwrite existing agent')
  .option('--list-templates', 'List available templates')
  .action(async (agentName, options) => {
    if (options.listTemplates) {
      console.log('Available templates:');
      creator.listTemplates().forEach(template => {
        console.log(`  - ${template}`);
      });
      return;
    }
    
    if (!agentName) {
      console.error(chalk.red('Agent name is required'));
      process.exit(1);
    }
    
    const spinner = ora('Creating agent...').start();
    
    try {
      let config = {};
      
      if (options.capabilities) {
        config.capabilities = options.capabilities.split(',').map(c => c.trim());
      }
      
      if (options.tools) {
        config.tools = options.tools.split(',').map(t => t.trim());
      }
      
      let agentPath;
      
      if (options.prompt) {
        agentPath = await creator.createFromPrompt({
          prompt: options.prompt,
          name: agentName,
          outputDir: process.cwd(),
          force: options.force
        });
      } else {
        agentPath = await creator.create({
          name: agentName,
          template: options.template,
          outputDir: process.cwd(),
          config,
          force: options.force
        });
      }
      
      spinner.stop();
      console.log(chalk.green(`Created agent at ${agentPath}`));
    } catch (error) {
      spinner.stop();
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  program.help();
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();