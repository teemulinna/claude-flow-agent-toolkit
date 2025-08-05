/**
 * Agent Creator
 * Creates new agents with proper configuration
 */

import path from 'path';
import fs from 'fs/promises';
import { AgentConfig } from './config.mjs';
import { 
    serializeToFrontmatter,
    safeWriteFile,
    ensureDirectory
} from './utils.mjs';

export class AgentCreator {
    constructor(options = {}) {
        this.baseDir = options.baseDir || process.cwd();
        this.agentsDir = options.agentsDir || path.join(this.baseDir, '.claude/agents');
        this.templates = options.templates || {};
    }

    /**
     * Create a new agent
     */
    async create(options) {
        const {
            name,
            type = 'core',
            description,
            capabilities = [],
            directory,
            template,
            content = ''
        } = options;

        if (!name) {
            throw new Error('Agent name is required');
        }

        // Validate name format  
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
            throw new Error('Invalid agent name. Agent name must be lowercase and only contain letters, numbers, and hyphens');
        }
        
        // Use name as-is since it's already validated
        const normalizedName = name;
        
        // Determine directory
        const targetDir = directory || this.getDefaultDirectory(type);
        const dirPath = path.join(this.agentsDir, targetDir);
        const filePath = path.join(dirPath, `${normalizedName}.md`);

        // Check if agent already exists
        if (!options.force) {
            try {
                await fs.access(filePath);
                throw new Error(`Agent ${normalizedName} already exists at ${filePath}`);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }

        // Generate configuration
        let config;
        if (template) {
            const templateConfig = this.getTemplate(template);
            if (!templateConfig) {
                throw new Error(`Unknown template: ${template}`);
            }
            // Use template config as base but don't include name/description from template
            const { name: _, description: __, ...baseConfig } = templateConfig;
            config = AgentConfig.generateDefaults(normalizedName, type, {
                description: description || templateConfig.description,
                capabilities: capabilities || templateConfig.capabilities,
                ...baseConfig
            });
        } else {
            config = AgentConfig.generateDefaults(normalizedName, type, {
                description,
                capabilities
            });
        }

        // Apply custom configuration
        if (options.config) {
            // Handle tools specially - if array is provided, use it as-is
            if (options.config.tools && Array.isArray(options.config.tools)) {
                config.tools = options.config.tools;
            } else if (options.config.tools && config.tools) {
                // Deep merge for tools object
                config.tools = {
                    ...config.tools,
                    ...options.config.tools
                };
            }
            // Apply other configs
            const { tools, ...otherConfig } = options.config;
            Object.assign(config, otherConfig);
        }
        
        // Handle dependencies if provided
        if (options.dependencies) {
            config.dependencies = options.dependencies;
        }
        
        // Handle hooks if provided
        if (options.hooks) {
            config.hooks = options.hooks;
        }

        // Create agent content
        const agentContent = this.generateAgentContent(config, content);
        const fullContent = serializeToFrontmatter(config, agentContent);

        // Ensure directory exists
        await ensureDirectory(dirPath);

        // Write file
        await safeWriteFile(filePath, fullContent, { backup: false });

        return {
            name: normalizedName,
            type: config.type,
            path: filePath,
            relativePath: path.relative(this.baseDir, filePath)
        };
    }

    /**
     * Create multiple agents from a specification
     */
    async createBatch(batchConfig) {
        const { agents = [], stopOnError = false, outputDir } = batchConfig;
        const results = [];

        for (const spec of agents) {
            try {
                // Apply outputDir if not already specified in the spec
                const createOptions = {
                    ...spec,
                    directory: spec.directory || spec.outputDir || outputDir
                };
                const result = await this.create(createOptions);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ 
                    success: false, 
                    name: spec.name, 
                    error: error.message 
                });
                if (stopOnError) {
                    break;
                }
            }
        }

        return results;
    }

    /**
     * Get default directory for agent type
     */
    getDefaultDirectory(type) {
        // Check if it's a strict type directory
        if (AgentConfig.STRICT_DIRECTORIES[type]) {
            return AgentConfig.STRICT_DIRECTORIES[type];
        }

        // Default to core for unknown types
        return 'core';
    }

    /**
     * Generate agent content
     */
    generateAgentContent(config, customContent = '') {
        if (customContent) {
            return customContent;
        }

        // Generate default content based on agent type
        let content = `# ${this.titleCase(config.name)} Agent\n\n`;
        content += `## Purpose\n${config.description}\n\n`;
        
        content += `## Core Capabilities\n`;
        config.capabilities.forEach(cap => {
            content += `- ${this.titleCase(cap.replace(/_/g, ' '))}\n`;
        });
        content += '\n';

        content += `## Usage\n`;
        content += `This agent is activated by the following triggers:\n`;
        content += `- Keywords: ${config.triggers.keywords.join(', ')}\n`;
        content += `- Patterns: ${config.triggers.patterns.join(', ')}\n\n`;

        content += `## Available Tools\n`;
        if (Array.isArray(config.tools)) {
            config.tools.forEach(tool => {
                content += `- ${tool}\n`;
            });
        } else {
            content += `### Allowed Tools\n`;
            config.tools.allowed.forEach(tool => {
                content += `- ${tool}\n`;
            });
            content += `\n### Restricted Tools\n`;
            config.tools.restricted.forEach(tool => {
                content += `- ${tool}\n`;
            });
        }
        content += '\n';

        content += `## Constraints\n`;
        content += `- Max file operations: ${config.constraints.max_file_operations}\n`;
        content += `- Max execution time: ${config.constraints.max_execution_time}s\n`;
        content += `- Max concurrent operations: ${config.constraints.max_concurrent_operations}\n\n`;

        content += `## Implementation\n`;
        content += `[Implementation details go here]\n\n`;

        content += `## Best Practices\n`;
        content += `[Best practices for using this agent]\n\n`;

        content += `## Examples\n`;
        content += `[Usage examples]\n`;

        return content;
    }

    /**
     * Create agent from template
     */
    async createFromTemplate(templateName, options) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Unknown template: ${templateName}`);
        }

        // Extract template config without the name/description
        const { name: _, description: __, ...templateConfig } = template;

        return this.create({
            ...options,
            ...templateConfig,
            template: templateName
        });
    }

    /**
     * Title case helper
     */
    titleCase(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * List available templates
     */
    listTemplates() {
        return [
            'basic',
            'swarm-coordinator',
            'github-integration',
            'code-analyzer',
            'test-runner',
            'reviewer',
            'orchestrator',
            'analyzer',
            'implementer',
            'researcher',
            'tester'
        ];
    }
    
    /**
     * Get template details
     */
    getTemplate(templateName) {
        const templates = {
            'basic': {
                name: 'basic',
                type: 'core',
                description: 'Basic agent template',
                capabilities: ['basic_operations'],
                tools: {
                    allowed: ['Read', 'Write'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'swarm-coordinator': {
                name: 'swarm-coordinator',
                type: 'swarm',
                description: 'Swarm coordination agent',
                capabilities: ['swarm_coordination', 'topology_management', 'agent_orchestration'],
                tools: {
                    allowed: ['Read', 'Write', 'mcp__claude-flow__swarm_init', 'mcp__claude-flow__agent_spawn'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'github-integration': {
                name: 'github-integration',
                type: 'github',
                description: 'GitHub integration agent',
                capabilities: ['github_operations', 'pr_management', 'issue_tracking'],
                tools: {
                    allowed: ['Bash', 'Read', 'Write', 'mcp__github__*'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'code-analyzer': {
                name: 'code-analyzer',
                type: 'analysis',
                description: 'Code analysis agent',
                capabilities: ['code_analysis', 'quality_metrics', 'pattern_detection'],
                tools: {
                    allowed: ['Read', 'Grep', 'Glob'],
                    restricted: ['Write', 'Edit', 'Bash', 'Task'],
                    conditional: []
                }
            },
            'test-runner': {
                name: 'test-runner',
                type: 'testing',
                description: 'Test runner agent',
                capabilities: ['test_execution', 'coverage_analysis', 'test_generation'],
                tools: {
                    allowed: ['Read', 'Write', 'Bash'],
                    restricted: ['Task'],
                    conditional: [
                        {
                            tool: 'Bash',
                            condition: 'command.includes("test") || command.includes("jest") || command.includes("mocha")',
                            allowed: true
                        }
                    ]
                }
            },
            'reviewer': {
                name: 'reviewer',
                type: 'core',
                description: 'Code review specialist for thorough code review and quality assessment',
                capabilities: ['review', 'code_quality_assessment', 'best_practices_enforcement'],
                tools: {
                    allowed: ['Read', 'Grep', 'Glob'],
                    restricted: ['Write', 'Edit', 'Bash', 'Task'],
                    conditional: []
                }
            },
            'orchestrator': {
                name: 'orchestrator',
                type: 'core',
                description: 'Task orchestration agent',
                capabilities: ['task_orchestration', 'workflow_management', 'dependency_resolution'],
                tools: {
                    allowed: ['Read', 'Write', 'mcp__claude-flow__task_orchestrate'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'analyzer': {
                name: 'analyzer',
                type: 'core',
                description: 'System analysis agent',
                capabilities: ['system_analysis', 'performance_metrics', 'optimization_recommendations'],
                tools: {
                    allowed: ['Read', 'Grep', 'Glob'],
                    restricted: ['Write', 'Edit', 'Bash', 'Task'],
                    conditional: []
                }
            },
            'implementer': {
                name: 'implementer',
                type: 'core',
                description: 'Implementation specialist',
                capabilities: ['implementation', 'code_generation', 'feature_development'],
                tools: {
                    allowed: ['Read', 'Write', 'Edit', 'MultiEdit'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'researcher': {
                name: 'researcher',
                type: 'core',
                description: 'Research specialist',
                capabilities: ['research', 'information_gathering', 'documentation_analysis'],
                tools: {
                    allowed: ['Read', 'WebSearch', 'WebFetch', 'Grep'],
                    restricted: ['Write', 'Edit', 'Bash', 'Task'],
                    conditional: []
                }
            },
            'tester': {
                name: 'tester',
                type: 'testing',
                description: 'Testing specialist',
                capabilities: ['test', 'test_creation', 'test_execution', 'coverage_analysis'],
                tools: {
                    allowed: ['Read', 'Write', 'Bash'],
                    restricted: ['Task'],
                    conditional: []
                }
            }
        };
        
        return templates[templateName] || null;
    }

    /**
     * Create agent from natural language prompt
     */
    async createFromPrompt(options) {
        const { prompt, name, outputDir, force } = options;
        
        // Simple prompt parsing to extract capabilities and tools
        const capabilities = [];
        const tools = { allowed: [], restricted: [] };
        
        // Look for capability keywords
        const capabilityKeywords = ['analyze', 'create', 'validate', 'fix', 'monitor', 'coordinate', 'test', 'security'];
        capabilityKeywords.forEach(keyword => {
            if (prompt.toLowerCase().includes(keyword)) {
                capabilities.push(keyword);
            }
        });
        
        // Look for tool keywords and map to proper tool names
        const toolMapping = {
            'read': 'Read',
            'write': 'Write',
            'bash': 'Bash',
            'git': 'Bash',
            'npm': 'Bash',
            'analyze': 'Grep',
            'search': 'Grep',
            'test': 'Bash'
        };
        
        Object.entries(toolMapping).forEach(([keyword, tool]) => {
            if (prompt.toLowerCase().includes(keyword) && !tools.allowed.includes(tool)) {
                tools.allowed.push(tool);
            }
        });
        
        // Add default tools based on capabilities
        if (capabilities.includes('analyze') && !tools.allowed.includes('Read')) {
            tools.allowed.push('Read');
        }
        if (capabilities.includes('test') && !tools.allowed.includes('Write')) {
            tools.allowed.push('Write');
        }
        
        // Set restricted tools
        tools.restricted = ['Task'];
        tools.conditional = [];
        
        // Create the agent
        const result = await this.create({
            name,
            description: prompt,
            capabilities: capabilities.length > 0 ? capabilities : ['general'],
            config: { 
                tools,
                prompts: {
                    main: `You are a ${name} agent specializing in ${prompt.toLowerCase()}.`
                }
            },
            directory: outputDir,
            force
        });
        
        return result.path;
    }
}