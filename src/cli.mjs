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
        const result = await validator.validateAgent(
          join(process.cwd(), '.claude', 'agents', `${agentName}.json`)
        );
        results = { results: [{ name: agentName, ...result }] };
      } else {
        // Validate all agents
        results = await validator.validateAll(process.cwd());
      }
      
      spinner.stop();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        let hasErrors = false;
        
        for (const result of results.results) {
          if (result.valid) {
            console.log(chalk.green(`✓ ${result.name}`));
          } else {
            hasErrors = true;
            console.log(chalk.red(`✗ ${result.name}`));
            result.errors.forEach(error => {
              console.log(chalk.red(`  - ${error.field}: ${error.message}`));
            });
          }
        }
        
        console.log();
        if (hasErrors) {
          console.log(chalk.red(`${results.results.filter(r => !r.valid).length} validation errors found`));
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
        results = await fixer.fixAll(process.cwd(), { dryRun: options.dryRun });
      } else if (agentName) {
        const result = await fixer.fixSingle(
          join(process.cwd(), '.claude', 'agents', `${agentName}.json`),
          { dryRun: options.dryRun }
        );
        results = { results: [result] };
      } else {
        spinner.stop();
        console.error(chalk.red('Please specify an agent name or use --all'));
        process.exit(1);
      }
      
      spinner.stop();
      
      const fixed = results.results.filter(r => r.fixed).length;
      const wouldFix = results.results.filter(r => r.wouldFix).length;
      
      if (options.dryRun) {
        console.log(chalk.yellow(`Would fix ${wouldFix} agents`));
      } else {
        console.log(chalk.green(`Fixed ${fixed} agents`));
      }
      
      results.results.forEach(result => {
        if (result.fixed || result.wouldFix) {
          const prefix = options.dryRun ? 'Would fix' : 'Fixed';
          console.log(chalk.green(`${prefix} ${result.name}:`));
          result.changes.forEach(change => {
            console.log(`  - ${change}`);
          });
        }
      });
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