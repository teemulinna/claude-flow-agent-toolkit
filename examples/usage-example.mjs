#!/usr/bin/env node

/**
 * Example usage of the Agent Toolkit
 * Shows how to use the toolkit programmatically
 */

import { 
    AgentValidator, 
    AgentFixer, 
    AgentAnalyzer, 
    AgentCreator,
    AgentConfig 
} from '../lib/index.mjs';
import chalk from 'chalk';

async function main() {
    console.log(chalk.bold.blue('Claude Flow Agent Toolkit - Usage Examples\n'));

    // Example 1: Validate agents
    console.log(chalk.yellow('1. Validating agents...'));
    const validator = new AgentValidator({
        agentsDir: './.claude/agents',
        excludeDirs: ['docs', '_templates']
    });
    
    const validationResults = await validator.validateAll();
    console.log(`Found ${validationResults.total} agents`);
    console.log(`Valid: ${validationResults.valid}`);
    console.log(`Errors: ${validationResults.errors}`);
    console.log(`Success rate: ${Math.round(validationResults.valid / validationResults.total * 100)}%\n`);

    // Example 2: Fix issues
    console.log(chalk.yellow('2. Fixing agent issues...'));
    const fixer = new AgentFixer({
        agentsDir: './.claude/agents',
        dryRun: true,  // Set to false to actually fix
        verbose: true
    });
    
    const fixResults = await fixer.fixAll();
    console.log(`Would fix ${fixResults.fixed} agents`);
    console.log(`Skipped: ${fixResults.skipped}`);
    console.log(`Errors: ${fixResults.errors}\n`);

    // Example 3: Analyze system
    console.log(chalk.yellow('3. Analyzing agent system...'));
    const analyzer = new AgentAnalyzer({
        agentsDir: './.claude/agents'
    });
    
    const analysis = await analyzer.analyze();
    console.log(`Total agents: ${analysis.summary.totalAgents}`);
    console.log(`Types: ${Object.keys(analysis.summary.types).join(', ')}`);
    console.log(`Recommendations: ${analysis.recommendations.length}\n`);

    // Example 4: Create new agent
    console.log(chalk.yellow('4. Creating new agent...'));
    const creator = new AgentCreator({
        agentsDir: './.claude/agents'
    });
    
    // This would create the agent - commenting out to avoid file creation
    /*
    const newAgent = await creator.create({
        name: 'example-agent',
        type: 'core',
        description: 'Example agent created by toolkit',
        capabilities: ['example_capability', 'demo_capability']
    });
    console.log(`Created agent: ${newAgent.name} at ${newAgent.relativePath}`);
    */
    console.log('(Agent creation skipped in example)\n');

    // Example 5: Show configuration
    console.log(chalk.yellow('5. Agent configuration:'));
    console.log(`Valid types: ${AgentConfig.VALID_TYPES.join(', ')}`);
    console.log(`Required fields: ${AgentConfig.REQUIRED_FIELDS.length}`);
    console.log(`Functional directories: ${AgentConfig.FUNCTIONAL_DIRECTORIES.join(', ')}`);
}

// Run examples
main().catch(console.error);