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
    .command('validate [agent-name]')
    .description('Validate agent configurations')
    .option('-d, --dir <directory>', 'Agents directory', '.claude/agents')
    .option('-f, --format <format>', 'Output format (text, json)', 'text')
    .option('-o, --output <file>', 'Output file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (agentName, options) => {
        const spinner = ora('Validating agents...').start();
        
        try {
            const validator = new AgentValidator({
                agentsDir: path.resolve(options.dir),
                verbose: options.verbose
            });
            
            let results;
            if (agentName && agentName !== '*') {
                // Validate single agent
                const agentPath = path.join(path.resolve(options.dir), `${agentName}.md`);
                const jsonPath = path.join(path.resolve(options.dir), `${agentName}.json`);
                let filePath;
                
                try {
                    await fs.access(agentPath);
                    filePath = agentPath;
                } catch {
                    try {
                        await fs.access(jsonPath);
                        filePath = jsonPath;
                    } catch {
                        spinner.fail(`Agent ${agentName} not found`);
                        process.exit(1);
                    }
                }
                
                const result = await validator.validateFile(filePath);
                results = {
                    total: 1,
                    valid: result.status === 'valid' ? 1 : 0,
                    warnings: result.status === 'warning' ? 1 : 0,
                    errors: result.status === 'error' ? 1 : 0,
                    details: [result],
                    typeStats: {}
                };
            } else {
                // Validate all agents (when no name specified or * wildcard)
                results = await validator.validateAll();
            }
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
            
            // Show summary only for non-JSON formats
            if (options.format !== 'json') {
                const successRate = Math.round((results.valid / results.total) * 100);
                console.log('\n' + chalk.bold('Summary:'));
                console.log(chalk.green(`✅ Valid: ${results.valid}`));
                console.log(chalk.yellow(`⚠️  Warnings: ${results.warnings}`));
                console.log(chalk.red(`❌ Errors: ${results.errors}`));
                console.log(chalk.blue(`📊 Success Rate: ${successRate}%`));
                
                if (results.errors > 0) {
                    console.log(chalk.red('\nvalidation errors found'));
                }
            }
            
            process.exit(results.errors > 0 ? 1 : 0);
        } catch (error) {
            spinner.fail('Validation failed');
            console.error(chalk.red(error.message));
            process.exit(1);
        }
    });

// Fix command
program
    .command('fix [agent-name]')
    .description('Fix common agent configuration issues')
    .option('-d, --dir <directory>', 'Agents directory', '.claude/agents')
    .option('--dry-run', 'Show what would be fixed without making changes')
    .option('--no-backup', 'Skip creating backup files')
    .option('-v, --verbose', 'Verbose output')
    .option('--tools-format', 'Fix tools format issues')
    .option('--type-mismatches', 'Fix type mismatches')
    .option('--all', 'Fix all issues')
    .action(async (agentName, options) => {
        const spinner = ora('Fixing agent issues...').start();
        
        try {
            const fixer = new AgentFixer({
                agentsDir: path.resolve(options.dir),
                dryRun: options.dryRun,
                backup: options.backup,
                verbose: options.verbose
            });
            
            let results;
            
            if (agentName) {
                // Fix single agent
                results = await fixer.fixSingle(agentName);
                // Convert single result to match expected format
                results = {
                    total: 1,
                    fixed: results.fixed ? 1 : 0,
                    skipped: results.fixed ? 0 : 1,
                    errors: results.error ? 1 : 0,
                    details: [results]
                };
            } else if (options.toolsFormat || options.typeMismatches) {
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
                console.log('Would fix:');
            }
            
            console.log(chalk.bold('\nFix Results:'));
            const fixedCount = results.fixed || results.total || 0;
            console.log(chalk.green(`✅ Fixed: ${fixedCount}`));
            console.log(chalk.blue(`⏭️  Skipped: ${results.skipped || 0}`));
            console.log(chalk.red(`❌ Errors: ${results.errors || 0}`));
            
            // Add agent count message
            if (fixedCount > 0) {
                console.log(chalk.green(`\nFixed ${fixedCount} agent${fixedCount === 1 ? '' : 's'}`));
            }
            
            if (options.verbose && results.details) {
                console.log('\nDetails:');
                for (const detail of results.details) {
                    if (detail.fixed) {
                        console.log(`\n${chalk.green('✅')} ${detail.relativePath}`);
                        detail.fixes.forEach(fix => console.log(`   • ${fix}`));
                    }
                }
            }
            
            // For single agent fix, show agent name
            if (agentName && results.details && results.details.length === 1) {
                const detail = results.details[0];
                const name = detail.agent_name || agentName;
                if (name) {
                    console.log(`\n${chalk.blue('Agent:')} ${name}`);
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

// Create command with additional options
program
    .command('create <name>')
    .description('Create a new agent')
    .option('-t, --type <type>', 'Agent type', 'core')
    .option('-d, --description <description>', 'Agent description')
    .option('-c, --capabilities <capabilities>', 'Comma-separated capabilities')
    .option('--template <template>', 'Use a template')
    .option('--dir <directory>', 'Target directory')
    .option('-i, --interactive', 'Interactive mode')
    .option('--tools <tools>', 'Comma-separated tools')
    .option('--prompt <prompt>', 'Create from natural language prompt')
    .option('--force', 'Overwrite existing agent')
    .option('--list-templates', 'List available templates')
    .action(async (name, options) => {
        // Handle --list-templates
        if (options.listTemplates) {
            const creator = new AgentCreator();
            const templates = creator.listTemplates();
            console.log(chalk.bold('Available templates:'));
            templates.forEach(template => {
                console.log(`  • ${template}`);
            });
            process.exit(0);
        }
        try {
            const creator = new AgentCreator();
            
            // Handle prompt-based creation
            if (options.prompt) {
                const agentPath = await creator.createFromPrompt({
                    prompt: options.prompt,
                    name,
                    outputDir: options.dir,
                    force: options.force
                });
                console.log(chalk.green(`✅ Created agent from prompt`));
                console.log(chalk.blue(`📁 Path: ${agentPath}`));
                console.log(chalk.blue(`🏷️  Name: ${name}`));
                return;
            }
            
            let createOptions = {
                name,
                type: options.type,
                description: options.description,
                capabilities: options.capabilities ? options.capabilities.split(',').map(c => c.trim()) : [],
                directory: options.dir,
                template: options.template
            };
            
            // Add tools if specified
            if (options.tools) {
                createOptions.config = {
                    tools: {
                        allowed: options.tools.split(',').map(t => t.trim()),
                        restricted: ['Task'],
                        conditional: []
                    }
                };
            }
            
            // Handle templates
            if (options.template) {
                const result = await creator.createFromTemplate(options.template, {
                    name,
                    description: options.description,
                    directory: options.dir
                });
                
                console.log(chalk.green(`✅ Created agent from template: ${options.template}`));
                console.log(chalk.blue(`📁 Path: ${result.relativePath}`));
                console.log(chalk.blue(`🏷️  Name: ${result.name}`));
                console.log(chalk.blue(`🎯 Type: ${result.type}`));
                return;
            }
            
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
                
                if (responses) {
                Object.assign(createOptions, responses);
            }
            }
            
            // Check if agent already exists
            if (!options.force) {
                const baseDir = creator.baseDir;
                const agentPath = path.join(baseDir, '.claude/agents', createOptions.directory || 'core', `${name}.md`);
                try {
                    await fs.access(agentPath);
                    console.error(chalk.red(`❌ Agent ${name} already exists at ${agentPath}`));
                    process.exit(1);
                } catch {
                    // Agent doesn't exist, proceed
                }
            }
            
            const result = await creator.create(createOptions);
            
            console.log(chalk.green(`✅ Created agent successfully!`));
            console.log(chalk.blue(`📁 Path: ${result.relativePath}`));
            console.log(chalk.blue(`🏷️  Name: ${result.name}`));
            console.log(chalk.blue(`🎯 Type: ${result.type}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ ${error.message}`));
            process.exit(1);
        }
    });

// List templates command
program
    .command('list-templates')
    .description('List available agent templates')
    .action(() => {
        const creator = new AgentCreator();
        const templates = creator.listTemplates();
        console.log(chalk.bold('Available Templates:'));
        templates.forEach(template => {
            console.log(`  • ${template}`);
        });
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