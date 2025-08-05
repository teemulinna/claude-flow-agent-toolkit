/**
 * Agent Fixer
 * Automatically fixes common agent configuration issues
 */

import path from 'path';
import fs from 'fs/promises';
import { AgentConfig } from './config.mjs';
import { 
    extractYamlFrontmatter, 
    serializeToFrontmatter,
    findMarkdownFiles,
    getRelativePath,
    safeReadFile,
    safeWriteFile,
    deepMerge,
    convertToolsToObject,
    determineAgentType
} from './utils.mjs';

export class AgentFixer {
    constructor(options = {}) {
        this.baseDir = options.baseDir || process.cwd();
        this.agentsDir = options.agentsDir || path.join(this.baseDir, '.claude/agents');
        this.backup = options.backup !== false;
        this.dryRun = options.dryRun || false;
        this.verbose = options.verbose || false;
        this.fixes = [];
    }

    /**
     * Fix all agents in the directory
     */
    async fixAll(options = {}) {
        const mdFiles = await findMarkdownFiles(this.agentsDir);
        const jsonFiles = await this.findJsonFiles(this.agentsDir);
        const allFiles = [...mdFiles, ...jsonFiles];
        
        const results = {
            total: allFiles.length,
            fixed: 0,
            skipped: 0,
            errors: 0,
            details: []
        };

        for (const filePath of allFiles) {
            const result = await this.fixFile(filePath, options);
            results.details.push(result);
            
            if (result.fixed) results.fixed++;
            else if (result.error) results.errors++;
            else results.skipped++;
        }

        return results;
    }

    /**
     * Fix a single agent file
     */
    async fixFile(filePath, options = {}) {
        const relativePath = getRelativePath(filePath, this.agentsDir);
        
        try {
            const content = await safeReadFile(filePath);
            let existingData, remainingContent = '';
            
            if (filePath.endsWith('.json')) {
                // Handle JSON files
                try {
                    existingData = JSON.parse(content);
                } catch (error) {
                    return {
                        file: filePath,
                        relativePath,
                        fixed: false,
                        error: `Failed to parse JSON: ${error.message}`,
                        agent_name: 'unknown',
                        agent_type: 'unknown'
                    };
                }
            } else {
                // Handle Markdown files
                [existingData, remainingContent] = extractYamlFrontmatter(content);
            }
            
            const fixes = [];
            let hasChanges = false;
            let fixedData = { ...existingData };
            
            // No frontmatter at all - create from scratch
            if (Object.keys(existingData).length === 0) {
                const agentName = path.basename(filePath).replace(/\.(md|json)$/, '');
                const agentType = determineAgentType(filePath, {});
                fixedData = AgentConfig.generateDefaults(agentName, agentType);
                fixes.push('Added complete configuration');
                hasChanges = true;
            } else {
                // Fix missing fields
                const missingFields = this.findMissingFields(existingData);
                if (missingFields.length > 0) {
                    const defaults = AgentConfig.generateDefaults(
                        existingData.name || path.basename(filePath).replace(/\.(md|json)$/, ''),
                        existingData.type || 'core'
                    );
                    fixedData = deepMerge(defaults, existingData);
                    fixes.push(`Added missing fields: ${missingFields.join(', ')}`);
                    hasChanges = true;
                }
                
                // Fix invalid type
                if (fixedData.type && !AgentConfig.VALID_TYPES.includes(fixedData.type)) {
                    const oldType = fixedData.type;
                    fixedData.type = AgentConfig.normalizeType(oldType);
                    fixes.push(`Fixed type: ${oldType} → ${fixedData.type}`);
                    hasChanges = true;
                }
                
                // Fix invalid color
                if (fixedData.color && !/^#[0-9A-Fa-f]{6}$/.test(fixedData.color)) {
                    const newColor = AgentConfig.TYPE_COLORS[fixedData.type] || '#666666';
                    fixes.push(`Fixed color: ${fixedData.color} → ${newColor}`);
                    fixedData.color = newColor;
                    hasChanges = true;
                }
                
                // Fix tools format
                if (fixedData.tools && Array.isArray(fixedData.tools)) {
                    fixedData.tools = convertToolsToObject(fixedData.tools);
                    fixes.push('Converted tools from array to object format');
                    hasChanges = true;
                }
                
                // Fix name format
                if (fixedData.name && !/^[a-z][a-z0-9-]*$/.test(fixedData.name)) {
                    const oldName = fixedData.name;
                    fixedData.name = oldName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    fixes.push(`Fixed name format: ${oldName} → ${fixedData.name}`);
                    hasChanges = true;
                }
                
                // Fix version format
                if (fixedData.version && !/^\d+\.\d+\.\d+$/.test(fixedData.version)) {
                    fixedData.version = '1.0.0';
                    fixes.push('Fixed version to semantic format');
                    hasChanges = true;
                }
            }
            
            // Apply custom fixes
            if (options.customFixes) {
                const customResult = await options.customFixes(fixedData, filePath);
                if (customResult.changes) {
                    fixedData = customResult.data;
                    fixes.push(...customResult.fixes);
                    hasChanges = true;
                }
            }
            
            // Write changes if not dry run
            if (hasChanges && !this.dryRun) {
                let newContent;
                if (filePath.endsWith('.json')) {
                    newContent = JSON.stringify(fixedData, null, 2);
                } else {
                    newContent = serializeToFrontmatter(fixedData, remainingContent);
                }
                await safeWriteFile(filePath, newContent, { backup: this.backup });
            }
            
            return {
                file: filePath,
                relativePath,
                fixed: hasChanges,
                fixes,
                agent_name: fixedData.name,
                agent_type: fixedData.type
            };
            
        } catch (error) {
            return {
                file: filePath,
                relativePath,
                fixed: false,
                error: error.message,
                agent_name: 'unknown',
                agent_type: 'unknown'
            };
        }
    }

    /**
     * Fix specific issues
     */
    async fixSpecificIssues(options = {}) {
        const results = {
            toolsFormat: 0,
            typeMismatches: 0,
            misplacedAgents: 0,
            total: 0
        };

        // Fix tools format for GitHub agents
        if (options.fixToolsFormat) {
            results.toolsFormat = await this.fixGitHubToolsFormat();
        }

        // Fix type mismatches
        if (options.fixTypeMismatches) {
            results.typeMismatches = await this.fixTypeMismatches();
        }

        // Move misplaced agents
        if (options.moveMisplacedAgents) {
            results.misplacedAgents = await this.moveMisplacedAgents();
        }

        results.total = results.toolsFormat + results.typeMismatches + results.misplacedAgents;
        return results;
    }

    /**
     * Fix GitHub agents tools format
     */
    async fixGitHubToolsFormat() {
        const githubDir = path.join(this.agentsDir, 'github');
        let fixed = 0;

        try {
            const files = await findMarkdownFiles(githubDir);
            
            for (const filePath of files) {
                const content = await safeReadFile(filePath);
                const [yamlData, remainingContent] = extractYamlFrontmatter(content);
                
                if (yamlData.tools && Array.isArray(yamlData.tools)) {
                    yamlData.tools = convertToolsToObject(yamlData.tools);
                    
                    if (!this.dryRun) {
                        const newContent = serializeToFrontmatter(yamlData, remainingContent);
                        await safeWriteFile(filePath, newContent, { backup: this.backup });
                    }
                    
                    fixed++;
                    if (this.verbose) {
                        console.log(`Fixed tools format in ${path.basename(filePath)}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error fixing GitHub tools format: ${error.message}`);
        }

        return fixed;
    }

    /**
     * Fix type mismatches in strict directories
     */
    async fixTypeMismatches() {
        let fixed = 0;

        for (const [dir, expectedType] of Object.entries(AgentConfig.STRICT_DIRECTORIES)) {
            const dirPath = path.join(this.agentsDir, dir);
            
            try {
                const files = await findMarkdownFiles(dirPath);
                
                for (const filePath of files) {
                    const content = await safeReadFile(filePath);
                    const [yamlData, remainingContent] = extractYamlFrontmatter(content);
                    
                    if (yamlData.type !== expectedType) {
                        const oldType = yamlData.type;
                        yamlData.type = expectedType;
                        yamlData.color = AgentConfig.TYPE_COLORS[expectedType];
                        
                        if (!this.dryRun) {
                            const newContent = serializeToFrontmatter(yamlData, remainingContent);
                            await safeWriteFile(filePath, newContent, { backup: this.backup });
                        }
                        
                        fixed++;
                        if (this.verbose) {
                            console.log(`Fixed type in ${path.basename(filePath)}: ${oldType} → ${expectedType}`);
                        }
                    }
                }
            } catch (error) {
                // Directory might not exist
            }
        }

        return fixed;
    }

    /**
     * Move misplaced agents to correct directories
     */
    async moveMisplacedAgents() {
        // This would require more complex logic to determine
        // which agents should be moved where
        // For now, return 0 as this needs manual review
        return 0;
    }

    /**
     * Find missing required fields
     */
    findMissingFields(data) {
        return AgentConfig.REQUIRED_FIELDS.filter(field => !(field in data));
    }

    /**
     * Fix agent configuration in memory (without file I/O)
     */
    fixAgent(filePath, agentData) {
        const fixedData = { ...agentData };
        const agentName = fixedData.name || path.basename(filePath, '.md');
        const agentType = fixedData.type || determineAgentType(filePath, agentData);
        
        // Generate defaults
        const defaults = AgentConfig.generateDefaults(agentName, agentType);
        
        // Merge with defaults to add missing fields
        const merged = deepMerge(defaults, fixedData);
        
        // Fix invalid type
        if (merged.type && !AgentConfig.VALID_TYPES.includes(merged.type)) {
            merged.type = AgentConfig.normalizeType(merged.type);
        }
        
        // Fix invalid color
        if (merged.color && !/^#[0-9A-Fa-f]{6}$/.test(merged.color)) {
            merged.color = AgentConfig.TYPE_COLORS[merged.type] || '#666666';
        }
        
        // Fix tools format
        if (merged.tools && Array.isArray(merged.tools)) {
            merged.tools = convertToolsToObject(merged.tools);
        }
        
        // Fix name format
        if (merged.name && !/^[a-z][a-z0-9-]*$/.test(merged.name)) {
            merged.name = merged.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
        
        // Fix version format
        if (merged.version && !/^\d+\.\d+\.\d+$/.test(merged.version)) {
            merged.version = '1.0.0';
        }
        
        // Fix priority
        if (!['low', 'medium', 'high', 'critical'].includes(merged.priority)) {
            merged.priority = 'medium';
        }
        
        // Add default capabilities based on type
        if (merged.type === 'swarm' && merged.capabilities && !merged.capabilities.includes('coordination')) {
            merged.capabilities.push('coordination');
        }
        if (merged.type === 'github' && merged.capabilities && !merged.capabilities.includes('repository_management')) {
            merged.capabilities.push('repository_management');
        }
        
        return merged;
    }

    /**
     * Find all JSON files recursively
     */
    async findJsonFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...await this.findJsonFiles(fullPath));
                } else if (entry.isFile() && entry.name.endsWith('.json')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore errors
        }
        return files;
    }

    /**
     * Fix a single agent by name
     */
    async fixSingle(agentName) {
        const mdFiles = await findMarkdownFiles(this.agentsDir);
        const jsonFiles = await this.findJsonFiles(this.agentsDir);
        const allFiles = [...mdFiles, ...jsonFiles];
        
        const normalizedName = agentName.replace(/\.(md|json)$/, '');
        const agentFile = allFiles.find(f => {
            const baseName = path.basename(f).replace(/\.(md|json)$/, '');
            return baseName === normalizedName;
        });
        
        if (!agentFile) {
            throw new Error(`Agent ${agentName} not found`);
        }
        
        const result = await this.fixFile(agentFile);
        
        // Create backup directory if needed
        if (this.backup && result.fixed && !this.dryRun) {
            const backupDir = path.join(this.agentsDir, '.backup');
            const fs = await import('fs/promises');
            await fs.mkdir(backupDir, { recursive: true });
        }
        
        return result;
    }

    /**
     * Generate fix report
     */
    generateReport(results, format = 'text') {
        if (format === 'json') {
            return JSON.stringify(results, null, 2);
        }

        let report = `Agent Fix Report\n`;
        report += `================\n\n`;
        report += `Total Files: ${results.total}\n`;
        report += `Fixed: ${results.fixed}\n`;
        report += `Skipped: ${results.skipped}\n`;
        report += `Errors: ${results.errors}\n\n`;

        if (results.fixed > 0) {
            report += `Files Fixed:\n`;
            report += `-----------\n`;
            for (const detail of results.details) {
                if (detail.fixed) {
                    report += `\n${detail.relativePath}:\n`;
                    for (const fix of detail.fixes) {
                        report += `  • ${fix}\n`;
                    }
                }
            }
        }

        if (results.errors > 0) {
            report += `\nErrors:\n`;
            report += `-------\n`;
            for (const detail of results.details) {
                if (detail.error) {
                    report += `${detail.relativePath}: ${detail.error}\n`;
                }
            }
        }

        return report;
    }
}