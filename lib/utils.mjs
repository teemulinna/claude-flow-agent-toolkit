/**
 * Utility functions for agent operations
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Extract YAML frontmatter and content from a markdown file
 */
export function extractYamlFrontmatter(content) {
    if (!content.startsWith('---\n')) {
        return [{}, content];
    }
    
    try {
        const endMatch = content.slice(4).indexOf('\n---\n');
        if (endMatch === -1) {
            return [{}, content];
        }
            
        const yamlContent = content.slice(4, endMatch + 4);
        const remainingContent = content.slice(endMatch + 8);
        
        const yamlData = yaml.load(yamlContent);
        return [yamlData || {}, remainingContent];
        
    } catch (error) {
        return [{}, content];
    }
}

/**
 * Serialize data to YAML frontmatter format
 */
export function serializeToFrontmatter(data, content) {
    const yamlOutput = yaml.dump(data, { 
        defaultFlowStyle: false, 
        sortKeys: false,
        lineWidth: -1
    });
    
    return `---\n${yamlOutput}---\n\n${content}`;
}

/**
 * Recursively find all markdown files in a directory
 */
export async function findMarkdownFiles(dir, options = {}) {
    const files = [];
    const { 
        exclude = ['node_modules', '.git', 'dist', 'build'],
        includeOnly = null 
    } = options;
    
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Skip excluded directories
                if (exclude.includes(entry.name)) continue;
                
                // If includeOnly is specified, only include those directories
                if (includeOnly && !includeOnly.includes(entry.name)) continue;
                
                const subFiles = await findMarkdownFiles(fullPath, options);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return files;
}

/**
 * Determine agent type from file path and existing data
 */
export function determineAgentType(filePath, existingData = {}) {
    if (existingData.type) {
        return existingData.type;
    }
    
    const pathParts = filePath.split(path.sep);
    const fileName = path.basename(filePath, '.md');
    
    // Check directory names for type hints
    for (const part of pathParts) {
        if (['core', 'swarm', 'consensus', 'github', 'testing', 'architecture',
             'documentation', 'analysis', 'specialized', 'devops', 'optimization',
             'templates', 'data', 'hive-mind', 'sparc'].includes(part)) {
            return part;
        }
    }
    
    // Check filename for type hints
    if (fileName.includes('swarm')) return 'swarm';
    if (fileName.includes('test')) return 'testing';
    if (fileName.includes('doc')) return 'documentation';
    if (fileName.includes('architect')) return 'architecture';
    
    return 'core';
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectory(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Deep merge objects
 */
export function deepMerge(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get relative path from base directory
 */
export function getRelativePath(filePath, baseDir) {
    return path.relative(baseDir, filePath);
}

/**
 * Safe file read with error handling
 */
export async function safeReadFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}

/**
 * Safe file write with backup
 */
export async function safeWriteFile(filePath, content, options = {}) {
    const { backup = true } = options;
    
    try {
        // Create backup if requested and file exists
        if (backup) {
            try {
                const existing = await fs.readFile(filePath, 'utf-8');
                const backupPath = `${filePath}.backup`;
                await fs.writeFile(backupPath, existing);
            } catch (error) {
                // File doesn't exist, no backup needed
            }
        }
        
        // Ensure directory exists
        await ensureDirectory(path.dirname(filePath));
        
        // Write file
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
}

/**
 * Convert tools array to object format
 */
export function convertToolsToObject(tools) {
    if (!Array.isArray(tools)) {
        return tools;
    }
    
    return {
        allowed: tools.filter(t => !['Task'].includes(t)),
        restricted: ['Task'],
        conditional: []
    };
}