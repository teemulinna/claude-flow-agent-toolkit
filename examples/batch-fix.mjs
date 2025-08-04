#!/usr/bin/env node

/**
 * Example: Batch fixing multiple agent directories
 * Shows how to use the toolkit to fix agents across multiple projects
 */

import { AgentFixer } from '../lib/fixer.mjs';
import { AgentValidator } from '../lib/validator.mjs';
import path from 'path';
import chalk from 'chalk';

async function fixProjectAgents(projectPath, projectName) {
    console.log(chalk.blue(`\n📦 Processing ${projectName}...`));
    
    const agentsDir = path.join(projectPath, '.claude/agents');
    
    // First validate to see current state
    const validator = new AgentValidator({ agentsDir });
    const beforeResults = await validator.validateAll();
    
    console.log(`Before: ${beforeResults.valid}/${beforeResults.total} valid (${Math.round(beforeResults.valid / beforeResults.total * 100)}%)`);
    
    // Fix issues
    const fixer = new AgentFixer({ 
        agentsDir,
        backup: true,
        verbose: false 
    });
    
    const fixResults = await fixer.fixAll();
    console.log(`Fixed: ${fixResults.fixed} agents`);
    
    // Validate again to show improvement
    const afterResults = await validator.validateAll();
    console.log(`After: ${afterResults.valid}/${afterResults.total} valid (${Math.round(afterResults.valid / afterResults.total * 100)}%)`);
    
    // Show improvement
    const improvement = afterResults.valid - beforeResults.valid;
    if (improvement > 0) {
        console.log(chalk.green(`✅ Improved by ${improvement} agents!`));
    }
    
    return {
        project: projectName,
        before: beforeResults,
        after: afterResults,
        fixed: fixResults.fixed
    };
}

async function main() {
    console.log(chalk.bold('🔧 Batch Agent Fixer Example\n'));
    
    // Example: Fix agents in multiple projects
    const projects = [
        { path: process.cwd(), name: 'Current Project' },
        // Add more projects here:
        // { path: '/path/to/project1', name: 'Project 1' },
        // { path: '/path/to/project2', name: 'Project 2' },
    ];
    
    const results = [];
    
    for (const project of projects) {
        try {
            const result = await fixProjectAgents(project.path, project.name);
            results.push(result);
        } catch (error) {
            console.error(chalk.red(`❌ Error processing ${project.name}: ${error.message}`));
        }
    }
    
    // Summary
    console.log(chalk.bold.yellow('\n📊 Summary Report'));
    console.log('─'.repeat(50));
    
    let totalBefore = 0;
    let totalAfter = 0;
    let totalFixed = 0;
    
    for (const result of results) {
        totalBefore += result.before.valid;
        totalAfter += result.after.valid;
        totalFixed += result.fixed;
        
        const improvement = ((result.after.valid / result.after.total) - (result.before.valid / result.before.total)) * 100;
        
        console.log(`${result.project}:`);
        console.log(`  Before: ${result.before.valid}/${result.before.total} (${Math.round(result.before.valid / result.before.total * 100)}%)`);
        console.log(`  After:  ${result.after.valid}/${result.after.total} (${Math.round(result.after.valid / result.after.total * 100)}%)`);
        console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
    }
    
    console.log('─'.repeat(50));
    console.log(chalk.bold(`Total agents fixed: ${totalFixed}`));
    console.log(chalk.bold(`Total improvement: ${totalAfter - totalBefore} agents`));
}

// Run the example
main().catch(console.error);