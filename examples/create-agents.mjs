#!/usr/bin/env node

/**
 * Example: Creating new agents programmatically
 * Shows how to use the toolkit to create agents with proper validation
 */

import { AgentCreator } from '../lib/creator.mjs';
import { AgentValidator } from '../lib/validator.mjs';
import path from 'path';
import chalk from 'chalk';

async function createExampleAgents() {
    console.log(chalk.bold('🤖 Agent Creation Example\n'));
    
    const agentsDir = path.join(process.cwd(), '.claude/agents');
    const creator = new AgentCreator({ agentsDir });
    const validator = new AgentValidator({ agentsDir });
    
    // Example 1: Create a simple analyzer agent
    console.log(chalk.blue('Creating code analyzer agent...'));
    const analyzerResult = await creator.createAgent({
        name: 'code-analyzer',
        type: 'analysis',
        description: 'Analyzes code quality and suggests improvements',
        capabilities: [
            'code_quality_analysis',
            'complexity_measurement',
            'pattern_detection'
        ],
        tools: {
            allowed: ['Read', 'Grep', 'Glob'],
            restricted: ['Write', 'Edit', 'Bash'],
            conditional: []
        }
    });
    
    if (analyzerResult.success) {
        console.log(chalk.green(`✅ Created: ${analyzerResult.path}`));
    } else {
        console.log(chalk.red(`❌ Failed: ${analyzerResult.error}`));
    }
    
    // Example 2: Create a GitHub integration agent
    console.log(chalk.blue('\nCreating GitHub PR manager agent...'));
    const githubResult = await creator.createAgent({
        name: 'pr-auto-reviewer',
        type: 'github',
        description: 'Automatically reviews pull requests and suggests improvements',
        priority: 'high',
        capabilities: [
            'pr_analysis',
            'code_review',
            'comment_generation',
            'status_checks'
        ],
        tools: {
            allowed: ['mcp__github__get_pull_request', 'mcp__github__create_pull_request_review'],
            restricted: ['mcp__github__merge_pull_request'],
            conditional: [{
                tool: 'mcp__github__update_pull_request_branch',
                condition: 'requires_user_approval'
            }]
        },
        triggers: {
            keywords: ['review', 'pr', 'pull request'],
            patterns: ['review.*PR', 'check.*pull.*request'],
            webhook_events: ['pull_request.opened', 'pull_request.synchronize']
        },
        communication: {
            can_spawn: ['code-analyzer'],
            can_delegate_to: ['test-runner'],
            shares_context_with: ['pr-manager']
        }
    });
    
    if (githubResult.success) {
        console.log(chalk.green(`✅ Created: ${githubResult.path}`));
    } else {
        console.log(chalk.red(`❌ Failed: ${githubResult.error}`));
    }
    
    // Example 3: Create a swarm coordinator agent
    console.log(chalk.blue('\nCreating swarm coordinator agent...'));
    const swarmResult = await creator.createAgent({
        name: 'task-distributor',
        type: 'swarm',
        description: 'Distributes tasks efficiently across available agents',
        priority: 'critical',
        capabilities: [
            'task_analysis',
            'load_balancing',
            'agent_coordination',
            'performance_monitoring'
        ],
        tools: {
            allowed: ['Task', 'mcp__claude-flow__agent_spawn', 'mcp__claude-flow__swarm_status'],
            restricted: [],
            conditional: []
        },
        constraints: {
            max_concurrent_agents: 10,
            task_timeout: 600,
            coordination_strategy: 'adaptive'
        },
        execution: {
            parallelization: {
                enabled: true,
                max_concurrent: 5,
                strategy: 'load-balanced'
            }
        }
    });
    
    if (swarmResult.success) {
        console.log(chalk.green(`✅ Created: ${swarmResult.path}`));
    } else {
        console.log(chalk.red(`❌ Failed: ${swarmResult.error}`));
    }
    
    // Validate all created agents
    console.log(chalk.yellow('\n📋 Validating created agents...'));
    const results = await validator.validateAll();
    console.log(`Total agents: ${results.total}`);
    console.log(`Valid: ${results.valid} (${Math.round(results.valid / results.total * 100)}%)`);
    
    if (results.errors.length > 0) {
        console.log(chalk.red('\nValidation errors:'));
        results.errors.forEach(error => {
            console.log(`  - ${error.file}: ${error.errors.join(', ')}`);
        });
    }
}

// Example: Create agents from templates
async function createFromTemplate() {
    console.log(chalk.bold('\n📄 Creating Agents from Templates\n'));
    
    const creator = new AgentCreator({ 
        agentsDir: path.join(process.cwd(), '.claude/agents') 
    });
    
    // Common agent templates
    const templates = [
        {
            name: 'api-endpoint-tester',
            type: 'testing',
            template: 'api-tester',
            customizations: {
                description: 'Tests REST API endpoints for correctness and performance',
                capabilities: ['endpoint_testing', 'response_validation', 'performance_measurement'],
                constraints: {
                    max_request_timeout: 30000,
                    allowed_methods: ['GET', 'POST', 'PUT', 'DELETE']
                }
            }
        },
        {
            name: 'security-scanner',
            type: 'analysis',
            template: 'security-analyzer',
            customizations: {
                description: 'Scans code for security vulnerabilities',
                priority: 'critical',
                capabilities: ['vulnerability_detection', 'dependency_scanning', 'secret_detection'],
                tools: {
                    allowed: ['Read', 'Grep', 'mcp__claude-flow__security_scan'],
                    restricted: ['Write', 'Edit', 'Bash'],
                    conditional: []
                }
            }
        },
        {
            name: 'performance-optimizer',
            type: 'specialized',
            template: 'optimizer',
            customizations: {
                description: 'Optimizes code for better performance',
                capabilities: ['performance_analysis', 'bottleneck_detection', 'optimization_suggestions'],
                execution: {
                    parallelization: {
                        enabled: true,
                        max_concurrent: 8,
                        strategy: 'cpu-bound'
                    }
                }
            }
        }
    ];
    
    for (const template of templates) {
        console.log(chalk.blue(`Creating ${template.name} from template...`));
        
        // Generate config from template
        const config = creator.generateFromTemplate(template.template, {
            name: template.name,
            type: template.type,
            ...template.customizations
        });
        
        // Create the agent
        const result = await creator.createAgent(config);
        
        if (result.success) {
            console.log(chalk.green(`✅ Created: ${result.path}`));
        } else {
            console.log(chalk.red(`❌ Failed: ${result.error}`));
        }
    }
}

// Example: Batch create related agents
async function createAgentTeam() {
    console.log(chalk.bold('\n👥 Creating Agent Team\n'));
    
    const creator = new AgentCreator({ 
        agentsDir: path.join(process.cwd(), '.claude/agents') 
    });
    
    // Create a team of agents that work together
    const team = [
        {
            name: 'frontend-developer',
            type: 'development',
            role: 'UI Implementation',
            canSpawn: ['component-generator'],
            canDelegateTo: ['style-optimizer', 'accessibility-checker']
        },
        {
            name: 'backend-developer',
            type: 'development',
            role: 'API Implementation',
            canSpawn: ['database-migrator'],
            canDelegateTo: ['api-tester', 'performance-optimizer']
        },
        {
            name: 'devops-engineer',
            type: 'specialized',
            role: 'Deployment & Infrastructure',
            canSpawn: ['docker-builder', 'ci-runner'],
            canDelegateTo: ['security-scanner', 'monitoring-setup']
        },
        {
            name: 'qa-engineer',
            type: 'testing',
            role: 'Quality Assurance',
            canSpawn: ['test-generator', 'regression-runner'],
            canDelegateTo: ['bug-reporter', 'test-analyzer']
        },
        {
            name: 'project-coordinator',
            type: 'swarm',
            role: 'Team Coordination',
            canSpawn: ['frontend-developer', 'backend-developer', 'devops-engineer', 'qa-engineer'],
            canDelegateTo: []
        }
    ];
    
    console.log(`Creating team of ${team.length} agents...`);
    
    for (const member of team) {
        const config = {
            name: member.name,
            type: member.type,
            description: `${member.role} specialist in the development team`,
            priority: member.name === 'project-coordinator' ? 'critical' : 'high',
            capabilities: generateCapabilities(member.role),
            tools: generateTools(member.type),
            communication: {
                can_spawn: member.canSpawn,
                can_delegate_to: member.canDelegateTo,
                requires_approval_from: member.name === 'project-coordinator' ? [] : ['project-coordinator'],
                shares_context_with: team.map(m => m.name).filter(n => n !== member.name)
            }
        };
        
        const result = await creator.createAgent(config);
        console.log(`  ${result.success ? '✅' : '❌'} ${member.name}: ${member.role}`);
    }
    
    console.log(chalk.green('\n✨ Team creation complete!'));
}

// Helper functions
function generateCapabilities(role) {
    const roleCapabilities = {
        'UI Implementation': ['component_creation', 'state_management', 'responsive_design'],
        'API Implementation': ['endpoint_creation', 'database_operations', 'authentication'],
        'Deployment & Infrastructure': ['container_management', 'ci_cd_setup', 'monitoring'],
        'Quality Assurance': ['test_creation', 'bug_detection', 'regression_testing'],
        'Team Coordination': ['task_distribution', 'progress_tracking', 'resource_allocation']
    };
    return roleCapabilities[role] || ['general_development'];
}

function generateTools(type) {
    const typeTools = {
        'development': {
            allowed: ['Read', 'Write', 'Edit', 'Bash', 'Task'],
            restricted: [],
            conditional: []
        },
        'testing': {
            allowed: ['Read', 'Bash', 'Task'],
            restricted: ['Write', 'Edit'],
            conditional: []
        },
        'specialized': {
            allowed: ['Read', 'Write', 'Bash', 'Task'],
            restricted: [],
            conditional: [{ tool: 'Edit', condition: 'requires_review' }]
        },
        'swarm': {
            allowed: ['Task', 'mcp__claude-flow__agent_spawn', 'mcp__claude-flow__task_orchestrate'],
            restricted: ['Write', 'Edit'],
            conditional: []
        }
    };
    return typeTools[type] || typeTools['development'];
}

// Main execution
async function main() {
    try {
        await createExampleAgents();
        await createFromTemplate();
        await createAgentTeam();
        
        console.log(chalk.bold.green('\n🎉 All examples completed successfully!'));
    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { createExampleAgents, createFromTemplate, createAgentTeam };