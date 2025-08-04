/**
 * Agent Configuration Schema and Defaults
 * Defines the standard agent configuration format
 */

import path from 'path';

export class AgentConfig {
    // Required fields in standard schema
    static REQUIRED_FIELDS = [
        'name', 'type', 'color', 'description', 'version', 'priority',
        'capabilities', 'triggers', 'tools', 'constraints', 'communication',
        'dependencies', 'resources', 'execution', 'security', 'monitoring', 'hooks'
    ];

    // Valid agent types
    static VALID_TYPES = [
        'core', 'swarm', 'consensus', 'github', 'testing', 'architecture',
        'documentation', 'analysis', 'specialized', 'devops', 'optimization',
        'templates', 'data', 'hive-mind', 'sparc'
    ];

    // Valid priority levels
    static VALID_PRIORITIES = ['high', 'medium', 'low'];

    // Type to color mapping
    static TYPE_COLORS = {
        'core': '#FF6B35',
        'swarm': '#4ECDC4',
        'consensus': '#9C27B0',
        'github': '#24292E',
        'testing': '#4CAF50',
        'architecture': '#2196F3',
        'documentation': '#FFC107',
        'analysis': '#FF9800',
        'specialized': '#E91E63',
        'devops': '#795548',
        'optimization': '#607D8B',
        'templates': '#9E9E9E',
        'data': '#673AB7',
        'hive-mind': '#FF5722',
        'sparc': '#3F51B5'
    };

    // Functional directories that can contain any type
    static FUNCTIONAL_DIRECTORIES = [
        '_templates',     // Template/schema definitions
        'templates',      // Template and boilerplate generators
        'sparc',          // SPARC methodology agents
        'specialized',    // Domain-specific agents
        'hive-mind',      // Collective intelligence agents
        'development',    // Development workflow agents  
        'analysis'        // Analysis and review agents
    ];

    // Strict type-based directories
    static STRICT_DIRECTORIES = {
        'core': 'core',
        'swarm': 'swarm', 
        'consensus': 'consensus',
        'github': 'github',
        'testing': 'testing',
        'architecture': 'architecture',
        'documentation': 'documentation',
        'devops': 'devops',
        'optimization': 'optimization',
        'data': 'data'
    };

    // Type mapping for legacy types
    static TYPE_MAPPING = {
        'developer': 'core',
        'validator': 'core', 
        'coordinator': 'swarm',
        'analyst': 'analysis',
        'tester': 'testing',
        'architect': 'architecture',
        'development': 'github',
        'automation': 'optimization',
        'orchestration': 'templates',
        'planning': 'templates',
        'security': 'specialized',
        'synchronizer': 'consensus',
        'coordination': 'swarm',
        'unknown': 'core'
    };

    /**
     * Generate default configuration for an agent
     */
    static generateDefaults(agentName, agentType, options = {}) {
        const type = this.normalizeType(agentType);
        const color = this.TYPE_COLORS[type] || '#666666';
        
        return {
            name: agentName,
            type: type,
            color: color,
            description: options.description || `${agentName} agent for specialized tasks`,
            version: '1.0.0',
            priority: 'medium',
            capabilities: options.capabilities || [`${agentName}_capability`],
            triggers: {
                keywords: [agentName.replace(/-/g, ''), type],
                patterns: [`${agentName}.*`, `.*${type}.*`],
                file_patterns: ['*.md'],
                context_patterns: [type, 'task']
            },
            tools: {
                allowed: ['Read', 'Write', 'Edit', 'Grep', 'Glob'],
                restricted: ['Task'],
                conditional: []
            },
            constraints: {
                max_file_operations: 100,
                max_execution_time: 600,
                allowed_paths: ['src/**', 'docs/**'],
                forbidden_paths: ['node_modules/**', '.env*', 'secrets/**', '*.key', '*.pem'],
                max_file_size: 1048576,
                max_concurrent_operations: 5
            },
            communication: {
                can_spawn: [],
                can_delegate_to: [],
                requires_approval_from: [],
                shares_context_with: [],
                handoff_protocol: {
                    required_artifacts: [],
                    validation_steps: []
                }
            },
            dependencies: {
                requires: [],
                provides: [{
                    capability: `${agentName}_service`,
                    interface: 'v1'
                }],
                conflicts: []
            },
            resources: {
                memory_limit: '512MB',
                cpu_quota: '1000m',
                execution_timeout: '600s',
                concurrent_operations: 5
            },
            execution: {
                parallelization: {
                    enabled: true,
                    max_concurrent: 3,
                    strategy: 'adaptive'
                },
                batching: {
                    enabled: true,
                    batch_size: 10,
                    timeout: '30s'
                }
            },
            security: {
                sandboxing: {
                    enabled: true,
                    type: 'process',
                    restrictions: {
                        network: 'limited',
                        filesystem: 'restricted'
                    }
                },
                audit: {
                    enabled: true,
                    events: ['tool-usage', 'file-operations'],
                    retention: '30d'
                }
            },
            monitoring: {
                health_checks: {
                    enabled: true,
                    interval: '30s'
                },
                metrics: [
                    { name: 'execution_time', type: 'histogram' },
                    { name: 'success_rate', type: 'gauge' },
                    { name: 'operations_count', type: 'counter' }
                ]
            },
            hooks: {
                pre: `echo "🤖 ${agentName} agent starting: $TASK"`,
                post: `echo "✅ ${agentName} agent completed: $TASK"`
            }
        };
    }

    /**
     * Normalize agent type using mapping
     */
    static normalizeType(type) {
        if (this.VALID_TYPES.includes(type)) {
            return type;
        }
        return this.TYPE_MAPPING[type] || 'core';
    }

    /**
     * Validate directory placement
     */
    static validateDirectoryPlacement(filePath, agentType) {
        const parts = filePath.split(path.sep);
        const directory = parts[parts.length - 2];
        
        // Functional directories can contain any type
        if (this.FUNCTIONAL_DIRECTORIES.includes(directory)) {
            return { valid: true };
        }
        
        // Strict directories must match type
        if (Object.keys(this.STRICT_DIRECTORIES).includes(directory)) {
            const expectedType = this.STRICT_DIRECTORIES[directory];
            if (agentType !== expectedType) {
                return {
                    valid: false,
                    error: `Agent in '${directory}' directory should have type '${expectedType}', but has type '${agentType}'`
                };
            }
        }
        
        return { valid: true };
    }

    /**
     * Get configuration template
     */
    static getTemplate() {
        return this.generateDefaults('agent-name', 'core', {
            description: 'Description of what this agent does',
            capabilities: ['capability1', 'capability2']
        });
    }
}