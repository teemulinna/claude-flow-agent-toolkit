/**
 * Agent Validator
 * Validates agent configurations against the standard schema
 */

import path from 'path';
import { AgentConfig } from './config.mjs';
import { 
    extractYamlFrontmatter, 
    findMarkdownFiles, 
    getRelativePath,
    safeReadFile 
} from './utils.mjs';

export class AgentValidator {
    constructor(options = {}) {
        this.baseDir = options.baseDir || process.cwd();
        this.agentsDir = options.agentsDir || path.join(this.baseDir, '.claude/agents');
        this.excludeFiles = options.excludeFiles || [
            'README.md', 
            'MIGRATION_SUMMARY.md', 
            'agent-types.md', 
            'base-agent.yaml',
            'SYSTEM_STATUS.md'
        ];
        this.excludeDirs = options.excludeDirs || ['docs', '_templates'];
        this.verbose = options.verbose || false;
    }

    /**
     * Validate all agents in the directory
     */
    async validateAll() {
        const allFiles = await findMarkdownFiles(this.agentsDir);
        
        // Filter out excluded files and directories
        const agentFiles = allFiles.filter(f => {
            const fileName = path.basename(f);
            const relativePath = getRelativePath(f, this.agentsDir);
            
            // Exclude specific files
            if (this.excludeFiles.includes(fileName)) {
                return false;
            }
            
            // Exclude specific directories
            for (const excludeDir of this.excludeDirs) {
                if (relativePath.startsWith(excludeDir + path.sep)) {
                    return false;
                }
            }
            
            return true;
        });

        const results = {
            total: agentFiles.length,
            valid: 0,
            warnings: 0,
            errors: 0,
            details: []
        };

        for (const filePath of agentFiles) {
            const result = await this.validateFile(filePath);
            results.details.push(result);
            
            if (result.status === 'valid') results.valid++;
            else if (result.status === 'warning') results.warnings++;
            else results.errors++;
        }

        results.typeStats = this.calculateTypeStats(results.details);
        
        return results;
    }

    /**
     * Validate a single agent file
     */
    async validateFile(filePath) {
        try {
            const content = await safeReadFile(filePath);
            const [agentData, remainingContent] = extractYamlFrontmatter(content);
            
            if (Object.keys(agentData).length === 0) {
                return {
                    file: filePath,
                    relativePath: getRelativePath(filePath, this.agentsDir),
                    status: 'error',
                    errors: ['No YAML frontmatter found'],
                    warnings: [],
                    agent_name: 'unknown',
                    agent_type: 'unknown'
                };
            }
            
            // Validate configuration
            const configErrors = this.validateConfig(agentData);
            const directoryErrors = this.validateDirectory(filePath, agentData);
            
            const allErrors = [...configErrors, ...directoryErrors];
            const warnings = this.checkWarnings(agentData);
            
            const status = allErrors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'valid');
            
            return {
                file: filePath,
                relativePath: getRelativePath(filePath, this.agentsDir),
                status,
                errors: allErrors,
                warnings,
                agent_name: agentData.name || 'unknown',
                agent_type: agentData.type || 'unknown'
            };
            
        } catch (error) {
            return {
                file: filePath,
                relativePath: getRelativePath(filePath, this.agentsDir),
                status: 'error',
                errors: [`Failed to process file: ${error.message}`],
                warnings: [],
                agent_name: 'unknown',
                agent_type: 'unknown'
            };
        }
    }

    /**
     * Validate agent configuration
     */
    validateConfig(agentData) {
        const errors = [];
        
        // Check required fields
        for (const field of AgentConfig.REQUIRED_FIELDS) {
            if (!(field in agentData)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Validate specific fields
        if ('name' in agentData) {
            const name = agentData.name;
            if (typeof name !== 'string' || !name) {
                errors.push("'name' must be a non-empty string");
            } else if (!/^[a-z][a-z0-9-]*$/.test(name)) {
                errors.push("'name' must be kebab-case (lowercase, hyphens only)");
            }
        }
        
        if ('type' in agentData) {
            const agentType = agentData.type;
            if (!AgentConfig.VALID_TYPES.includes(agentType)) {
                errors.push(`Invalid type '${agentType}'. Must be one of: ${AgentConfig.VALID_TYPES.join(', ')}`);
            }
        }
        
        if ('priority' in agentData) {
            const priority = agentData.priority;
            if (!AgentConfig.VALID_PRIORITIES.includes(priority)) {
                errors.push(`Invalid priority '${priority}'. Must be one of: ${AgentConfig.VALID_PRIORITIES.join(', ')}`);
            }
        }
        
        if ('color' in agentData) {
            const color = agentData.color;
            if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
                errors.push("'color' must be a valid hex color (e.g., '#FF6B35')");
            }
        }
        
        if ('version' in agentData) {
            const version = agentData.version;
            if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
                errors.push("'version' must follow semantic versioning (e.g., '1.0.0')");
            }
        }
        
        // Validate tools structure
        if ('tools' in agentData) {
            const tools = agentData.tools;
            if (typeof tools !== 'object' || Array.isArray(tools)) {
                errors.push("'tools' must be an object");
            } else {
                const requiredToolFields = ['allowed', 'restricted'];
                for (const field of requiredToolFields) {
                    if (!(field in tools)) {
                        errors.push(`'tools.${field}' is required`);
                    } else if (!Array.isArray(tools[field])) {
                        errors.push(`'tools.${field}' must be an array`);
                    }
                }
            }
        }
        
        return errors;
    }

    /**
     * Validate directory placement
     */
    validateDirectory(filePath, agentData) {
        const errors = [];
        
        if (agentData.type) {
            const result = AgentConfig.validateDirectoryPlacement(filePath, agentData.type);
            if (!result.valid) {
                errors.push(result.error);
            }
        }
        
        return errors;
    }

    /**
     * Check for warnings
     */
    checkWarnings(agentData) {
        const warnings = [];
        
        if ('capabilities' in agentData && (!agentData.capabilities || agentData.capabilities.length === 0)) {
            warnings.push("No capabilities defined");
        }
        
        if ('triggers' in agentData) {
            const triggers = agentData.triggers;
            const hasAnyTriggers = ['keywords', 'patterns', 'file_patterns', 'context_patterns']
                .some(key => triggers[key] && triggers[key].length > 0);
            if (!hasAnyTriggers) {
                warnings.push("No trigger patterns defined");
            }
        }
        
        return warnings;
    }

    /**
     * Calculate statistics by agent type
     */
    calculateTypeStats(results) {
        const typeStats = {};
        
        for (const result of results) {
            const type = result.agent_type;
            if (!typeStats[type]) {
                typeStats[type] = { total: 0, valid: 0, warnings: 0, errors: 0 };
            }
            typeStats[type].total++;
            if (result.status === 'valid') typeStats[type].valid++;
            else if (result.status === 'warning') typeStats[type].warnings++;
            else typeStats[type].errors++;
        }
        
        return typeStats;
    }

    /**
     * Generate validation report
     */
    generateReport(results, format = 'text') {
        if (format === 'json') {
            return JSON.stringify(results, null, 2);
        }
        
        let report = `Agent Validation Report\n`;
        report += `=======================\n\n`;
        report += `Total Agents: ${results.total}\n`;
        report += `✅ Valid: ${results.valid} (${Math.round(results.valid / results.total * 100)}%)\n`;
        report += `⚠️  Warnings: ${results.warnings}\n`;
        report += `❌ Errors: ${results.errors}\n\n`;
        
        if (results.errors > 0) {
            report += `Errors Found:\n`;
            report += `-------------\n`;
            for (const result of results.details) {
                if (result.status === 'error') {
                    report += `\n${result.relativePath}:\n`;
                    for (const error of result.errors) {
                        report += `  • ${error}\n`;
                    }
                }
            }
        }
        
        if (results.warnings > 0) {
            report += `\nWarnings Found:\n`;
            report += `---------------\n`;
            for (const result of results.details) {
                if (result.status === 'warning') {
                    report += `\n${result.relativePath}:\n`;
                    for (const warning of result.warnings) {
                        report += `  • ${warning}\n`;
                    }
                }
            }
        }
        
        report += `\nStatistics by Type:\n`;
        report += `------------------\n`;
        for (const [type, stats] of Object.entries(results.typeStats).sort()) {
            const validPercent = Math.round((stats.valid / stats.total) * 100);
            report += `${type}: ${stats.total} total, ${stats.valid} valid (${validPercent}%)\n`;
        }
        
        return report;
    }
}