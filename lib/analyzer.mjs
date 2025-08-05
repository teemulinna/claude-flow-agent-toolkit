/**
 * Agent Analyzer
 * Analyzes agent system for insights and optimization opportunities
 */

import path from 'path';
import fs from 'fs/promises';
import { 
    extractYamlFrontmatter, 
    findMarkdownFiles,
    getRelativePath,
    safeReadFile,
    formatFileSize
} from './utils.mjs';
import { AgentValidator } from './validator.mjs';

export class AgentAnalyzer {
    constructor(options = {}) {
        this.baseDir = options.baseDir || process.cwd();
        this.agentsDir = options.agentsDir || path.join(this.baseDir, '.claude/agents');
    }

    /**
     * Analyze entire agent system
     */
    async analyze(targetDir) {
        const baseDirectory = targetDir || this.baseDir;
        const agentsDirectory = path.join(baseDirectory, '.claude/agents');
        
        // Check if agents directory exists
        try {
            await fs.stat(agentsDirectory);
        } catch (error) {
            return {
                summary: {
                    totalAgents: 0,
                    validAgents: 0,
                    invalidAgents: 0,
                    totalCapabilities: 0,
                    uniqueCapabilities: 0,
                    totalTools: 0,
                    uniqueTools: 0
                },
                agents: [],
                capabilities: {},
                tools: {},
                dependencies: {},
                issues: [{
                    type: 'info',
                    message: 'No agents directory found at .claude/agents'
                }]
            };
        }
        
        // Find all agent files (both .md and .json)
        const mdFiles = await findMarkdownFiles(agentsDirectory);
        const jsonFiles = await this.findJsonFiles(agentsDirectory);
        const allFiles = [...mdFiles, ...jsonFiles];
        
        const analysis = {
            summary: {
                totalAgents: 0,
                validAgents: 0,
                invalidAgents: 0,
                totalCapabilities: 0,
                uniqueCapabilities: 0,
                totalTools: 0,
                uniqueTools: 0,
                totalSize: 0,
                avgSize: 0,
                types: {},
                priorities: {},
                capabilities: new Set(),
                tools: new Set(),
                dependencies: []
            },
            agents: [],
            capabilities: {},
            tools: {},
            dependencies: {},
            typeAnalysis: {},
            toolUsage: {},
            dependencyGraph: {},
            securityAnalysis: {
                sandboxed: 0,
                unsandboxed: 0,
                restrictedPaths: new Set(),
                networkAccess: {}
            },
            performanceAnalysis: {
                parallelEnabled: 0,
                batchingEnabled: 0,
                resourceLimits: {}
            },
            recommendations: [],
            issues: []
        };

        // Process all files
        const agentNames = new Map();
        for (const filePath of allFiles) {
            const agentResult = await this.analyzeFile(filePath, analysis, agentNames);
            if (agentResult) {
                analysis.agents.push(agentResult);
            }
        }

        // Calculate averages and generate recommendations
        this.finalizeAnalysis(analysis);
        
        return analysis;
    }

    /**
     * Find JSON files recursively
     */
    async findJsonFiles(dir) {
        const results = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    results.push(...await this.findJsonFiles(fullPath));
                } else if (entry.name.endsWith('.json')) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore errors
        }
        return results;
    }

    /**
     * Analyze individual agent file
     */
    async analyzeFile(filePath, analysis, agentNames) {
        try {
            let agentData;
            let content;
            const stats = await fs.stat(filePath);
            
            if (filePath.endsWith('.json')) {
                // Handle JSON files
                content = await safeReadFile(filePath);
                try {
                    agentData = JSON.parse(content);
                } catch (error) {
                    analysis.summary.invalidAgents++;
                    return {
                        name: path.basename(filePath, '.json'),
                        valid: false,
                        errors: [`Failed to parse JSON: ${error.message}`],
                        path: filePath
                    };
                }
            } else {
                // Handle Markdown files
                content = await safeReadFile(filePath);
                const [yamlData, _] = extractYamlFrontmatter(content);
                agentData = yamlData;
                
                if (Object.keys(agentData).length === 0) {
                    analysis.summary.invalidAgents++;
                    return {
                        name: path.basename(filePath, '.md'),
                        valid: false,
                        errors: ['No YAML frontmatter found'],
                        path: filePath
                    };
                }
            }
            
            // Validate agent
            const validator = new AgentValidator();
            const errors = validator.validateConfig(agentData);
            
            const agentResult = {
                name: agentData.name || path.basename(filePath).replace(/\.(md|json)$/, ''),
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                path: filePath,
                complexity: this.calculateComplexity(agentData)
            };
            
            analysis.summary.totalAgents++;
            analysis.summary.totalSize += stats.size;
            
            if (agentResult.valid) {
                analysis.summary.validAgents++;
            } else {
                analysis.summary.invalidAgents++;
            }
            
            // Check for duplicate names
            if (agentNames.has(agentResult.name)) {
                analysis.issues.push({
                    type: 'warning',
                    message: `Duplicate agent name '${agentResult.name}' found in ${filePath} and ${agentNames.get(agentResult.name)}`
                });
            } else {
                agentNames.set(agentResult.name, filePath);
            }
            
            // Type analysis
            if (agentData.type) {
                analysis.summary.types[agentData.type] = (analysis.summary.types[agentData.type] || 0) + 1;
                
                if (!analysis.typeAnalysis[agentData.type]) {
                    analysis.typeAnalysis[agentData.type] = {
                        count: 0,
                        agents: [],
                        commonCapabilities: {},
                        commonTools: {}
                    };
                }
                
                const typeInfo = analysis.typeAnalysis[agentData.type];
                typeInfo.count++;
                typeInfo.agents.push(agentData.name);
            }
            
            // Priority analysis
            if (agentData.priority) {
                analysis.summary.priorities[agentData.priority] = (analysis.summary.priorities[agentData.priority] || 0) + 1;
            }
            
            // Capabilities analysis
            if (agentData.capabilities && Array.isArray(agentData.capabilities)) {
                agentData.capabilities.forEach(cap => {
                    analysis.summary.capabilities.add(cap);
                    analysis.capabilities[cap] = (analysis.capabilities[cap] || 0) + 1;
                    analysis.summary.totalCapabilities++;
                });
            }
            
            // Tools analysis  
            if (agentData.tools) {
                let tools = [];
                if (Array.isArray(agentData.tools)) {
                    tools = agentData.tools;
                } else if (agentData.tools.allowed) {
                    tools = agentData.tools.allowed;
                }
                
                tools.forEach(tool => {
                    analysis.summary.tools.add(tool);
                    analysis.tools[tool] = (analysis.tools[tool] || 0) + 1;
                    analysis.toolUsage[tool] = (analysis.toolUsage[tool] || 0) + 1;
                    analysis.summary.totalTools++;
                });
            }
            
            // Dependencies analysis
            if (agentData.dependencies) {
                let deps = [];
                if (Array.isArray(agentData.dependencies)) {
                    deps = agentData.dependencies;
                } else if (agentData.dependencies.requires) {
                    deps = agentData.dependencies.requires.map(d => d.name || d);
                }
                
                if (deps.length > 0) {
                    analysis.dependencies[agentResult.name] = deps;
                    deps.forEach(dep => {
                        analysis.summary.dependencies.push({
                            from: agentResult.name,
                            to: dep
                        });
                    });
                }
            }
            
            // Security analysis
            if (agentData.security) {
                if (agentData.security.sandboxing && agentData.security.sandboxing.enabled) {
                    analysis.securityAnalysis.sandboxed++;
                } else {
                    analysis.securityAnalysis.unsandboxed++;
                }
            }
            
            // Performance analysis
            if (agentData.execution) {
                if (agentData.execution.parallelization && agentData.execution.parallelization.enabled) {
                    analysis.performanceAnalysis.parallelEnabled++;
                }
                if (agentData.execution.batching && agentData.execution.batching.enabled) {
                    analysis.performanceAnalysis.batchingEnabled++;
                }
            }
            
            return agentResult;
            
        } catch (error) {
            analysis.summary.invalidAgents++;
            return {
                name: path.basename(filePath).replace(/\.(md|json)$/, ''),
                valid: false,
                errors: [`Error analyzing file: ${error.message}`],
                path: filePath
            };
        }
    }

    /**
     * Calculate agent complexity score
     */
    calculateComplexity(agentData) {
        let score = 0;
        
        // Capabilities complexity
        if (agentData.capabilities && Array.isArray(agentData.capabilities)) {
            score += agentData.capabilities.length;
        }
        
        // Tools complexity
        if (agentData.tools) {
            const toolCount = Array.isArray(agentData.tools) ? 
                agentData.tools.length : 
                (agentData.tools.allowed || []).length;
            score += toolCount;
        }
        
        // Dependencies complexity
        if (agentData.dependencies) {
            const depCount = Array.isArray(agentData.dependencies) ?
                agentData.dependencies.length :
                (agentData.dependencies.requires || []).length;
            score += depCount;
        }
        
        // Prompts complexity
        if (agentData.prompts) {
            score += Object.keys(agentData.prompts).length;
        }
        
        return score;
    }

    /**
     * Finalize analysis and generate recommendations
     */
    finalizeAnalysis(analysis) {
        const summary = analysis.summary;
        
        // Calculate averages and unique counts
        summary.avgSize = summary.totalAgents > 0 ? summary.totalSize / summary.totalAgents : 0;
        summary.uniqueCapabilities = summary.capabilities.size;
        summary.uniqueTools = summary.tools.size;
        // Keep as Set for tests that expect it, but also provide array versions
        const capabilitiesArray = Array.from(summary.capabilities);
        const toolsArray = Array.from(summary.tools);
        
        // Check for circular dependencies
        const circularDeps = this.findCircularDependencies(analysis.dependencies);
        if (circularDeps.length > 0) {
            circularDeps.forEach(circle => {
                analysis.issues.push({
                    type: 'error',
                    message: `Circular dependency detected: ${circle}`
                });
            });
        }
        
        // Generate recommendations
        const recommendations = [];
        
        // Security recommendations
        const unsandboxedPercent = (analysis.securityAnalysis.unsandboxed / summary.totalAgents) * 100;
        if (unsandboxedPercent > 20) {
            recommendations.push({
                type: 'security',
                severity: 'high',
                message: `${unsandboxedPercent.toFixed(1)}% of agents are not sandboxed. Consider enabling sandboxing for better security.`
            });
        }
        
        // Performance recommendations
        const parallelPercent = (analysis.performanceAnalysis.parallelEnabled / summary.totalAgents) * 100;
        if (parallelPercent < 50) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: `Only ${parallelPercent.toFixed(1)}% of agents have parallel execution enabled. Consider enabling for better performance.`
            });
        }
        
        // Dependency recommendations are already handled above via circularDeps
        
        // Tool usage recommendations
        const unusedTools = this.findUnusedTools(analysis.toolUsage, summary.tools);
        if (unusedTools.length > 0) {
            recommendations.push({
                type: 'optimization',
                severity: 'low',
                message: `Some tools are rarely used: ${unusedTools.join(', ')}. Consider removing or consolidating.`
            });
        }
        
        analysis.recommendations = recommendations;
    }

    /**
     * Find circular dependencies
     */
    findCircularDependencies(dependencies) {
        const circles = [];
        const visited = new Set();
        const recursionStack = new Set();
        
        const hasCycle = (node, path = []) => {
            if (recursionStack.has(node)) {
                const cycleStart = path.indexOf(node);
                const cycle = [...path.slice(cycleStart), node].join(' -> ');
                circles.push(cycle);
                return true;
            }
            
            if (visited.has(node)) {
                return false;
            }
            
            visited.add(node);
            recursionStack.add(node);
            path.push(node);
            
            const neighbors = dependencies[node] || [];
            for (const neighbor of neighbors) {
                if (hasCycle(neighbor, [...path])) {
                    // Continue checking for more cycles
                }
            }
            
            recursionStack.delete(node);
            return false;
        };
        
        // Check all nodes for cycles
        for (const node in dependencies) {
            if (!visited.has(node)) {
                hasCycle(node);
            }
        }
        
        return circles;
    }

    /**
     * Find rarely used tools
     */
    findUnusedTools(toolUsage, allTools) {
        const threshold = Math.max(1, allTools.length * 0.05); // 5% usage threshold
        return Object.entries(toolUsage)
            .filter(([tool, count]) => count <= threshold)
            .map(([tool]) => tool);
    }

    /**
     * Generate analysis report
     */
    generateReport(analysis, format = 'text') {
        if (format === 'json') {
            return JSON.stringify(analysis, null, 2);
        }
        
        if (format === 'markdown') {
            return this.generateMarkdownReport(analysis);
        }

        let report = `Claude Flow Agent System Analysis\n`;
        report += `=================================\n\n`;
        
        // Summary
        report += `Summary:\n`;
        report += `--------\n`;
        report += `Total Agents: ${analysis.summary.totalAgents}\n`;
        report += `Valid Agents: ${analysis.summary.validAgents}\n`;
        report += `Invalid Agents: ${analysis.summary.invalidAgents}\n`;
        if (analysis.summary.totalSize > 0) {
            report += `Total Size: ${formatFileSize(analysis.summary.totalSize)}\n`;
            report += `Average Size: ${formatFileSize(analysis.summary.avgSize)}\n`;
        }
        report += `\n`;
        
        // Capability distribution
        if (Object.keys(analysis.capabilities).length > 0) {
            report += `Capability Distribution:\n`;
            report += `------------------------\n`;
            for (const [cap, count] of Object.entries(analysis.capabilities).sort((a, b) => b[1] - a[1])) {
                report += `${cap}: ${count}\n`;
            }
            report += '\n';
        }
        
        // Tool usage
        if (Object.keys(analysis.tools).length > 0) {
            report += `Tool Usage:\n`;
            report += `-----------\n`;
            for (const [tool, count] of Object.entries(analysis.tools).sort((a, b) => b[1] - a[1])) {
                report += `${tool}: ${count}\n`;
            }
            report += '\n';
        }
        
        // Issues
        if (analysis.issues && analysis.issues.length > 0) {
            report += `Issues:\n`;
            report += `-------\n`;
            for (const issue of analysis.issues) {
                const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
                report += `${icon} ${issue.message}\n`;
            }
            report += '\n';
        }
        
        // Type distribution (if available)
        if (analysis.summary.types && Object.keys(analysis.summary.types).length > 0) {
            report += `Agent Types:\n`;
            report += `-----------\n`;
            for (const [type, count] of Object.entries(analysis.summary.types).sort((a, b) => b[1] - a[1])) {
                const percent = ((count / analysis.summary.totalAgents) * 100).toFixed(1);
                report += `${type}: ${count} (${percent}%)\n`;
            }
            report += '\n';
        }
        
        // Security analysis (if available)
        if (analysis.securityAnalysis && (analysis.securityAnalysis.sandboxed > 0 || analysis.securityAnalysis.unsandboxed > 0)) {
            report += `Security Analysis:\n`;
            report += `-----------------\n`;
            report += `Sandboxed: ${analysis.securityAnalysis.sandboxed}\n`;
            report += `Not Sandboxed: ${analysis.securityAnalysis.unsandboxed}\n\n`;
        }
        
        // Performance analysis (if available)
        if (analysis.performanceAnalysis && (analysis.performanceAnalysis.parallelEnabled > 0 || analysis.performanceAnalysis.batchingEnabled > 0)) {
            report += `Performance Analysis:\n`;
            report += `--------------------\n`;
            report += `Parallel Execution Enabled: ${analysis.performanceAnalysis.parallelEnabled}\n`;
            report += `Batching Enabled: ${analysis.performanceAnalysis.batchingEnabled}\n\n`;
        }
        
        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            report += `Recommendations:\n`;
            report += `---------------\n`;
            for (const rec of analysis.recommendations) {
                report += `[${rec.severity.toUpperCase()}] ${rec.type}: ${rec.message}\n`;
            }
        }
        
        return report;
    }

    /**
     * Generate markdown report
     */
    generateMarkdownReport(analysis) {
        let report = `# Claude Flow Agent System Analysis\n\n`;
        
        report += `## Summary\n\n`;
        report += `| Metric | Value |\n`;
        report += `|--------|-------|\n`;
        report += `| Total Agents | ${analysis.summary.totalAgents} |\n`;
        report += `| Valid Agents | ${analysis.summary.validAgents} |\n`;
        report += `| Invalid Agents | ${analysis.summary.invalidAgents} |\n`;
        if (analysis.summary.totalCapabilities) {
            report += `| Total Capabilities | ${analysis.summary.totalCapabilities} |\n`;
            report += `| Unique Capabilities | ${analysis.summary.uniqueCapabilities} |\n`;
        }
        if (analysis.summary.totalTools) {
            report += `| Total Tools | ${analysis.summary.totalTools} |\n`;
            report += `| Unique Tools | ${analysis.summary.uniqueTools} |\n`;
        }
        report += `\n`;
        
        // Issues
        if (analysis.issues && analysis.issues.length > 0) {
            report += `## Issues\n\n`;
            for (const issue of analysis.issues) {
                const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
                report += `${icon} ${issue.message}\n\n`;
            }
        }
        
        // Capabilities
        if (Object.keys(analysis.capabilities).length > 0) {
            report += `## Capability Distribution\n\n`;
            report += `| Capability | Count |\n`;
            report += `|------------|-------|\n`;
            for (const [cap, count] of Object.entries(analysis.capabilities).sort((a, b) => b[1] - a[1])) {
                report += `| ${cap} | ${count} |\n`;
            }
            report += `\n`;
        }
        
        // Tools
        if (Object.keys(analysis.tools).length > 0) {
            report += `## Tool Usage\n\n`;
            report += `| Tool | Count |\n`;
            report += `|------|-------|\n`;
            for (const [tool, count] of Object.entries(analysis.tools).sort((a, b) => b[1] - a[1])) {
                report += `| ${tool} | ${count} |\n`;
            }
            report += `\n`;
        }
        
        return report;
    }
}