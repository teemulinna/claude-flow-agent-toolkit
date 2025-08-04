/**
 * Agent Creator
 * Creates new agents with proper configuration
 */

import path from 'path';
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

        // Normalize name to kebab-case
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        // Determine directory
        const targetDir = directory || this.getDefaultDirectory(type);
        const dirPath = path.join(this.agentsDir, targetDir);
        const filePath = path.join(dirPath, `${normalizedName}.md`);

        // Check if agent already exists
        try {
            await fs.access(filePath);
            throw new Error(`Agent ${normalizedName} already exists at ${filePath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        // Generate configuration
        let config;
        if (template && this.templates[template]) {
            config = this.templates[template](normalizedName, type);
        } else {
            config = AgentConfig.generateDefaults(normalizedName, type, {
                description,
                capabilities
            });
        }

        // Apply custom configuration
        if (options.config) {
            Object.assign(config, options.config);
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
    async createBatch(specifications) {
        const results = [];

        for (const spec of specifications) {
            try {
                const result = await this.create(spec);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ 
                    success: false, 
                    name: spec.name, 
                    error: error.message 
                });
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
        content += `### Allowed Tools\n`;
        config.tools.allowed.forEach(tool => {
            content += `- ${tool}\n`;
        });
        content += `\n### Restricted Tools\n`;
        config.tools.restricted.forEach(tool => {
            content += `- ${tool}\n`;
        });
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
        const templates = {
            'swarm-coordinator': {
                type: 'swarm',
                capabilities: ['swarm_coordination', 'topology_management', 'agent_orchestration'],
                tools: {
                    allowed: ['Read', 'Write', 'mcp__claude-flow__swarm_init', 'mcp__claude-flow__agent_spawn'],
                    restricted: ['Bash', 'Task'],
                    conditional: []
                }
            },
            'github-integration': {
                type: 'github',
                capabilities: ['github_operations', 'pr_management', 'issue_tracking'],
                tools: {
                    allowed: ['Bash', 'Read', 'Write', 'mcp__github__*'],
                    restricted: ['Task'],
                    conditional: []
                }
            },
            'code-analyzer': {
                type: 'analysis',
                capabilities: ['code_analysis', 'quality_metrics', 'pattern_detection'],
                tools: {
                    allowed: ['Read', 'Grep', 'Glob'],
                    restricted: ['Write', 'Edit', 'Bash', 'Task'],
                    conditional: []
                }
            },
            'test-runner': {
                type: 'testing',
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
            }
        };

        const template = templates[templateName];
        if (!template) {
            throw new Error(`Unknown template: ${templateName}`);
        }

        return this.create({
            ...options,
            ...template,
            template: templateName
        });
    }

    /**
     * Title case helper
     */
    titleCase(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }
}