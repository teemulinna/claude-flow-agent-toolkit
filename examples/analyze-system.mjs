#!/usr/bin/env node

/**
 * Example: Analyzing an agent system
 * Shows how to use the toolkit to analyze agent configurations and relationships
 */

import { AgentAnalyzer } from '../lib/analyzer.mjs';
import { AgentValidator } from '../lib/validator.mjs';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs/promises';

async function analyzeAgentSystem() {
    console.log(chalk.bold('🔍 Agent System Analysis Example\n'));
    
    const agentsDir = path.join(process.cwd(), '.claude/agents');
    
    // Check if agents directory exists
    try {
        await fs.access(agentsDir);
    } catch (err) {
        console.log(chalk.yellow('⚠️  No .claude/agents directory found in current project'));
        console.log(chalk.gray('Run this example in a project with Claude Flow agents\n'));
        return;
    }
    
    const analyzer = new AgentAnalyzer({ agentsDir });
    const validator = new AgentValidator({ agentsDir });
    
    // First, validate the system
    console.log(chalk.blue('📋 Validating agent system...'));
    const validationResults = await validator.validateAll();
    console.log(`Valid agents: ${validationResults.valid}/${validationResults.total} (${Math.round(validationResults.valid / validationResults.total * 100)}%)\n`);
    
    // Analyze the system
    console.log(chalk.blue('🔎 Analyzing agent system...'));
    const analysis = await analyzer.analyzeSystem();
    
    // Display Overview
    console.log(chalk.bold.yellow('\n📊 System Overview'));
    console.log('─'.repeat(50));
    console.log(`Total Agents: ${analysis.overview.totalAgents}`);
    console.log(`Valid Agents: ${analysis.overview.validAgents}`);
    console.log(`Invalid Agents: ${analysis.overview.invalidAgents}`);
    console.log(`Health Score: ${analysis.overview.healthScore}%`);
    
    // Display Type Distribution
    console.log(chalk.bold.yellow('\n🏷️  Agent Type Distribution'));
    console.log('─'.repeat(50));
    const typeEntries = Object.entries(analysis.overview.byType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of typeEntries) {
        const percentage = Math.round(count / analysis.overview.totalAgents * 100);
        const bar = '█'.repeat(Math.floor(percentage / 2));
        console.log(`${type.padEnd(15)} ${count.toString().padStart(3)} ${bar} ${percentage}%`);
    }
    
    // Display Priority Distribution
    console.log(chalk.bold.yellow('\n🎯 Priority Distribution'));
    console.log('─'.repeat(50));
    for (const [priority, count] of Object.entries(analysis.overview.byPriority)) {
        const percentage = Math.round(count / analysis.overview.totalAgents * 100);
        const color = priority === 'critical' ? chalk.red :
                     priority === 'high' ? chalk.yellow :
                     priority === 'medium' ? chalk.blue :
                     chalk.gray;
        console.log(color(`${priority.padEnd(10)} ${count.toString().padStart(3)} (${percentage}%)`));
    }
    
    // Display Communication Patterns
    console.log(chalk.bold.yellow('\n🔗 Communication Patterns'));
    console.log('─'.repeat(50));
    
    // Most Connected Agents
    const connectionCounts = new Map();
    analysis.relationships.communication.forEach(rel => {
        connectionCounts.set(rel.from, (connectionCounts.get(rel.from) || 0) + 1);
        connectionCounts.set(rel.to, (connectionCounts.get(rel.to) || 0) + 1);
    });
    
    const sortedConnections = Array.from(connectionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    console.log('Most Connected Agents:');
    for (const [agent, connections] of sortedConnections) {
        console.log(`  ${agent}: ${connections} connections`);
    }
    
    // Display Capability Coverage
    console.log(chalk.bold.yellow('\n🎨 Top Capabilities'));
    console.log('─'.repeat(50));
    const capabilityCounts = new Map();
    analysis.agents.forEach(agent => {
        (agent.capabilities || []).forEach(cap => {
            capabilityCounts.set(cap, (capabilityCounts.get(cap) || 0) + 1);
        });
    });
    
    const topCapabilities = Array.from(capabilityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    for (const [capability, count] of topCapabilities) {
        console.log(`  ${capability.padEnd(30)} ${count} agents`);
    }
    
    // Display Tool Usage
    console.log(chalk.bold.yellow('\n🔧 Tool Usage Analysis'));
    console.log('─'.repeat(50));
    const toolUsage = new Map();
    
    analysis.agents.forEach(agent => {
        if (agent.tools && agent.tools.allowed) {
            agent.tools.allowed.forEach(tool => {
                toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
            });
        }
    });
    
    const topTools = Array.from(toolUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    console.log('Most Used Tools:');
    for (const [tool, count] of topTools) {
        const percentage = Math.round(count / analysis.overview.totalAgents * 100);
        console.log(`  ${tool.padEnd(35)} ${count} agents (${percentage}%)`);
    }
    
    // Identify Issues
    console.log(chalk.bold.yellow('\n⚠️  Potential Issues'));
    console.log('─'.repeat(50));
    
    // Circular dependencies
    const circularDeps = findCircularDependencies(analysis.relationships.dependencies);
    if (circularDeps.length > 0) {
        console.log(chalk.red('Circular Dependencies Found:'));
        circularDeps.forEach(cycle => {
            console.log(`  ${cycle.join(' → ')} → ${cycle[0]}`);
        });
    }
    
    // Isolated agents
    const isolatedAgents = analysis.agents.filter(agent => {
        const hasNoConnections = !analysis.relationships.communication.some(
            rel => rel.from === agent.name || rel.to === agent.name
        );
        const hasNoDependencies = !analysis.relationships.dependencies.some(
            rel => rel.from === agent.name || rel.to === agent.name
        );
        return hasNoConnections && hasNoDependencies;
    });
    
    if (isolatedAgents.length > 0) {
        console.log(chalk.yellow('\nIsolated Agents (no connections):'));
        isolatedAgents.forEach(agent => {
            console.log(`  - ${agent.name}`);
        });
    }
    
    // Missing capabilities
    const requiredCapabilities = new Set([
        'error_handling',
        'logging',
        'monitoring',
        'security_validation'
    ]);
    
    const missingCapabilities = Array.from(requiredCapabilities).filter(
        cap => !capabilityCounts.has(cap)
    );
    
    if (missingCapabilities.length > 0) {
        console.log(chalk.yellow('\nMissing System Capabilities:'));
        missingCapabilities.forEach(cap => {
            console.log(`  - ${cap}`);
        });
    }
    
    // Generate Recommendations
    console.log(chalk.bold.yellow('\n💡 Recommendations'));
    console.log('─'.repeat(50));
    
    const recommendations = generateRecommendations(analysis);
    recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
    });
    
    // Export detailed report
    const reportPath = path.join(process.cwd(), 'agent-analysis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(analysis, null, 2));
    console.log(chalk.green(`\n📄 Detailed report saved to: ${reportPath}`));
}

// Helper function to find circular dependencies
function findCircularDependencies(dependencies) {
    const graph = new Map();
    dependencies.forEach(dep => {
        if (!graph.has(dep.from)) graph.set(dep.from, []);
        graph.get(dep.from).push(dep.to);
    });
    
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    function dfs(node, path = []) {
        if (recursionStack.has(node)) {
            const cycleStart = path.indexOf(node);
            if (cycleStart !== -1) {
                cycles.push(path.slice(cycleStart));
            }
            return;
        }
        
        if (visited.has(node)) return;
        
        visited.add(node);
        recursionStack.add(node);
        path.push(node);
        
        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
            dfs(neighbor, [...path]);
        }
        
        recursionStack.delete(node);
    }
    
    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            dfs(node);
        }
    }
    
    return cycles;
}

// Generate recommendations based on analysis
function generateRecommendations(analysis) {
    const recommendations = [];
    
    // Health score recommendations
    if (analysis.overview.healthScore < 100) {
        recommendations.push(`Fix ${analysis.overview.invalidAgents} invalid agents to improve system health`);
    }
    
    // Type balance recommendations
    const typePercentages = {};
    Object.entries(analysis.overview.byType).forEach(([type, count]) => {
        typePercentages[type] = count / analysis.overview.totalAgents;
    });
    
    if (!typePercentages.testing || typePercentages.testing < 0.1) {
        recommendations.push('Add more testing agents (currently < 10% of system)');
    }
    
    if (!typePercentages.analysis || typePercentages.analysis < 0.15) {
        recommendations.push('Consider adding more analysis agents for better system insights');
    }
    
    // Priority balance
    const criticalCount = analysis.overview.byPriority.critical || 0;
    if (criticalCount > analysis.overview.totalAgents * 0.2) {
        recommendations.push('Too many critical priority agents (> 20%) - reassess priorities');
    }
    
    // Communication patterns
    const avgConnections = analysis.relationships.communication.length / analysis.overview.totalAgents;
    if (avgConnections < 1) {
        recommendations.push('Low inter-agent communication - consider adding more delegations');
    }
    
    // Security recommendations
    const hasSecurityAgents = analysis.agents.some(a => 
        a.capabilities && a.capabilities.some(c => c.includes('security'))
    );
    if (!hasSecurityAgents) {
        recommendations.push('No security-focused agents detected - add security validation capabilities');
    }
    
    // Performance recommendations
    const hasPerformanceMonitoring = analysis.agents.some(a =>
        a.capabilities && a.capabilities.some(c => c.includes('performance'))
    );
    if (!hasPerformanceMonitoring) {
        recommendations.push('Add performance monitoring capabilities to track system efficiency');
    }
    
    return recommendations;
}

// Visualize agent network (ASCII art)
async function visualizeNetwork() {
    console.log(chalk.bold('\n🕸️  Agent Network Visualization\n'));
    
    const analyzer = new AgentAnalyzer({ 
        agentsDir: path.join(process.cwd(), '.claude/agents') 
    });
    const analysis = await analyzer.analyzeSystem();
    
    // Create a simple ASCII visualization
    const nodes = new Map();
    let y = 0;
    
    // Group agents by type
    const agentsByType = {};
    analysis.agents.forEach(agent => {
        if (!agentsByType[agent.type]) agentsByType[agent.type] = [];
        agentsByType[agent.type].push(agent);
    });
    
    // Position nodes
    Object.entries(agentsByType).forEach(([type, agents]) => {
        console.log(chalk.bold(`\n[${type.toUpperCase()}]`));
        agents.forEach((agent, index) => {
            const x = index * 20;
            nodes.set(agent.name, { x, y, type });
            console.log(`  📦 ${agent.name}`);
            
            // Show connections
            const connections = analysis.relationships.communication
                .filter(rel => rel.from === agent.name)
                .map(rel => rel.to);
            
            if (connections.length > 0) {
                console.log(`     └─> ${connections.join(', ')}`);
            }
        });
        y += agents.length + 2;
    });
}

// Main execution
async function main() {
    try {
        await analyzeAgentSystem();
        await visualizeNetwork();
        
        console.log(chalk.bold.green('\n✨ Analysis complete!'));
    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { analyzeAgentSystem, visualizeNetwork };