#!/usr/bin/env node

/**
 * Claude Flow Agent Toolkit CLI
 * Command-line interface for agent management
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import { AgentValidator } from '../lib/validator.mjs';
import { AgentFixer } from '../lib/fixer.mjs';
import { AgentAnalyzer } from '../lib/analyzer.mjs';
import { AgentCreator } from '../lib/creator.mjs';
import { AgentConfig } from '../lib/config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
    await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8')
);

program
    .name('agent-toolkit')
    .description('Claude Flow Agent Toolkit - Validate, fix, and manage AI agents')
    .version(packageJson.version);

// Validate command
program
    .command('validate')
    .description('Validate agent configurations')
    .option('-d, --dir <directory>', 'Agents directory', '.claude/agents')
    .option('-f, --format <format>', 'Output format (text, json)', 'text')
    .option('-o, --output <file>', 'Output file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
        const spinner = ora('Validating agents...').start();
        
        try {
            const validator = new AgentValidator({
                agentsDir: path.resolve(options.dir),
                verbose: options.verbose
            });
            
            const results = await validator.validateAll();
            spinner.stop();
            
            // Generate report
            const report = validator.generateReport(results, options.format);
            
            // Output results
            if (options.output) {
                await fs.writeFile(options.output, report);
                console.log(chalk.green(`✅ Report saved to ${options.output}`));
            } else {
                console.log(report);
            }
            
            // Show summary
            const successRate = Math.round((results.valid / results.total) * 100);
            console.log('\n' + chalk.bold('Summary:'));
            console.log(chalk.green(`✅ Valid: ${results.valid}`));
            console.log(chalk.yellow(`⚠️  Warnings: ${results.warnings}`));
            console.log(chalk.red(`❌ Errors: ${results.errors}`));
            console.log(chalk.blue(`📊 Success Rate: ${successRate}%`));
            
            process.exit(results.errors > 0 ? 1 : 0);
        } catch (error) {
            spinner.fail('Validation failed');
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

// Fix command
program
    .command('fix')
    .description('Fix common agent configuration issues')
    .option('-d, --dir <directory>', 'Agents directory', '.claude/agents')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--no-backup', 'Skip creating backup files')
    .option('-v, --verbose', 'Verbose output')
    .option('--tools-format', 'Fix tools format issues')
    .option('--type-mismatches', 'Fix type mismatches')
    .option('--all', 'Fix all issues')
    .action(async (options) => {
        const spinner = ora('Fixing agent issues...').start();
        
        try {
            const fixer = new AgentFixer({
                agentsDir: path.resolve(options.dir),
                dryRun: options.dryRun,
                backup: options.backup,
                verbose: options.verbose
            });
            
            let results;
            
            if (options.toolsFormat || options.typeMismatches) {
                results = await fixer.fixSpecificIssues({
                    fixToolsFormat: options.toolsFormat,
                    fixTypeMismatches: options.typeMismatches
                });
            } else {
                results = await fixer.fixAll();
            }
            
            spinner.stop();
            
            // Show results
            if (options.dryRun) {
                console.log(chalk.yellow('🔍 Dry run - no changes made'));
            }
            
            console.log(chalk.bold('\nFix Results:'));
            console.log(chalk.green(`✅ Fixed: ${results.fixed || results.total || 0}`));
            console.log(chalk.blue(`⏭️  Skipped: ${results.skipped || 0}`));
            console.log(chalk.red(`❌ Errors: ${results.errors || 0}`));
            
            if (options.verbose && results.details) {
                console.log('\nDetails:');
                for (const detail of results.details) {
                    if (detail.fixed) {
                        console.log(`\n${chalk.green('✅')} ${detail.relativePath}`);
                        detail.fixes.forEach(fix => console.log(`   • ${fix}`));
                    }
                }
            }
            
        } catch (error) {
            spinner.fail('Fix failed');
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

// Analyze command
program
    .command('analyze')
    .description('Analyze agent system for insights')
    .option('-d, --dir <directory>', 'Agents directory', '.claude/agents')
    .option('-f, --format <format>', 'Output format (text, json)', 'text')
    .option('-o, --output <file>', 'Output file')
    .action(async (options) => {
        const spinner = ora('Analyzing agent system...').start();
        
        try {
            const analyzer = new AgentAnalyzer({
                agentsDir: path.resolve(options.dir)
            });
            
            const analysis = await analyzer.analyze();
            spinner.stop();
            
            // Generate report
            const report = analyzer.generateReport(analysis, options.format);
            
            // Output results
            if (options.output) {
                await fs.writeFile(options.output, report);
                console.log(chalk.green(`✅ Analysis saved to ${options.output}`));
            } else {
                console.log(report);
            }
            
        } catch (error) {
            spinner.fail('Analysis failed');
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

// Create command
program
    .command('create <name>')
    .description('Create a new agent')
    .option('-t, --type <type>', 'Agent type', 'core')
    .option('-d, --description <description>', 'Agent description')
    .option('-c, --capabilities <capabilities>', 'Comma-separated capabilities')
    .option('--template <template>', 'Use a template')
    .option('--dir <directory>', 'Target directory')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (name, options) => {
        try {
            const creator = new AgentCreator();
            
            let createOptions = {
                name,
                type: options.type,
                description: options.description,
                capabilities: options.capabilities ? options.capabilities.split(',') : [],
                directory: options.dir,
                template: options.template
            };
            
            // Interactive mode
            if (options.interactive) {
                const responses = await prompts([
                    {
                        type: 'select',
                        name: 'type',
                        message: 'Agent type:',
                        choices: AgentConfig.VALID_TYPES.map(t => ({ title: t, value: t })),
                        initial: AgentConfig.VALID_TYPES.indexOf(createOptions.type)
                    },
                    {
                        type: 'text',
                        name: 'description',
                        message: 'Description:',
                        initial: createOptions.description || `${name} agent for specialized tasks`
                    },
                    {
                        type: 'list',
                        name: 'capabilities',
                        message: 'Capabilities (comma-separated):',
                        initial: createOptions.capabilities.join(', '),
                        separator: ','
                    },
                    {
                        type: 'select',
                        name: 'template',
                        message: 'Use template:',
                        choices: [
                            { title: 'None', value: null },
                            { title: 'Swarm Coordinator', value: 'swarm-coordinator' },
                            { title: 'GitHub Integration', value: 'github-integration' },
                            { title: 'Code Analyzer', value: 'code-analyzer' },
                            { title: 'Test Runner', value: 'test-runner' }
                        ]
                    }
                ]);
                
                Object.assign(createOptions, responses);
            }
            
            const result = await creator.create(createOptions);
            
            console.log(chalk.green(`✅ Agent created successfully!`));
            console.log(chalk.blue(`📁 Path: ${result.relativePath}`));
            console.log(chalk.blue(`🏷️  Name: ${result.name}`));
            console.log(chalk.blue(`🎯 Type: ${result.type}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ ${error.message}`));
            process.exit(1);
        }
    });

// Config command
program
    .command('config')
    .description('Show configuration information')
    .option('--types', 'Show valid agent types')
    .option('--template', 'Show agent template')
    .action((options) => {
        if (options.types) {
            console.log(chalk.bold('Valid Agent Types:'));
            AgentConfig.VALID_TYPES.forEach(type => {
                const color = AgentConfig.TYPE_COLORS[type];
                console.log(`  ${chalk.hex(color)('●')} ${type}`);
            });
        } else if (options.template) {
            const template = AgentConfig.getTemplate();
            console.log(chalk.bold('Agent Configuration Template:'));
            console.log(JSON.stringify(template, null, 2));
        } else {
            console.log(chalk.bold('Agent Toolkit Configuration'));
            console.log(`Version: ${packageJson.version}`);
            console.log(`Valid Types: ${AgentConfig.VALID_TYPES.length}`);
            console.log(`Required Fields: ${AgentConfig.REQUIRED_FIELDS.length}`);
        }
    });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}