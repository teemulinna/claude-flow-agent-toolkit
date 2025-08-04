/**
 * Agent Analyzer
 * Analyzes agent system for insights and optimization opportunities
 */

import path from 'path';
import { 
    extractYamlFrontmatter, 
    findMarkdownFiles,
    getRelativePath,
    safeReadFile,
    formatFileSize
} from './utils.mjs';

export class AgentAnalyzer {
    constructor(options = {}) {
        this.baseDir = options.baseDir || process.cwd();
        this.agentsDir = options.agentsDir || path.join(this.baseDir, '.claude/agents');
    }

    /**
     * Analyze entire agent system
     */
    async analyze() {
        const allFiles = await findMarkdownFiles(this.agentsDir);
        
        const analysis = {
            summary: {
                totalAgents: 0,
                totalSize: 0,
                avgSize: 0,
                types: {},
                priorities: {},
                capabilities: new Set(),
                tools: new Set(),
                dependencies: []
            },
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
            recommendations: []
        };

        for (const filePath of allFiles) {
            await this.analyzeFile(filePath, analysis);
        }

        // Calculate averages and generate recommendations
        this.finalizeAnalysis(analysis);
        
        return analysis;
    }

    /**
     * Analyze individual agent file
     */
    async analyzeFile(filePath, analysis) {
        try {
            const content = await safeReadFile(filePath);
            const stats = await fs.stat(filePath);
            const [agentData, _] = extractYamlFrontmatter(content);
            
            if (Object.keys(agentData).length === 0) return;
            
            analysis.summary.totalAgents++;
            analysis.summary.totalSize += stats.size;
            
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
                });
            }
            
            // Tools analysis
            if (agentData.tools) {
                const tools = agentData.tools.allowed || [];
                tools.forEach(tool => {
                    analysis.summary.tools.add(tool);
                    analysis.toolUsage[tool] = (analysis.toolUsage[tool] || 0) + 1;
                });
            }
            
            // Dependencies analysis
            if (agentData.dependencies && agentData.dependencies.requires) {
                agentData.dependencies.requires.forEach(dep => {
                    analysis.summary.dependencies.push({
                        from: agentData.name,
                        to: dep.name,
                        version: dep.version
                    });
                });
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
            
        } catch (error) {
            // Skip files with errors
        }
    }

    /**
     * Finalize analysis and generate recommendations
     */
    finalizeAnalysis(analysis) {
        const summary = analysis.summary;
        
        // Calculate averages
        summary.avgSize = summary.totalAgents > 0 ? summary.totalSize / summary.totalAgents : 0;
        summary.capabilities = Array.from(summary.capabilities);
        summary.tools = Array.from(summary.tools);
        
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
        
        // Dependency recommendations
        const circularDeps = this.findCircularDependencies(summary.dependencies);
        if (circularDeps.length > 0) {
            recommendations.push({
                type: 'architecture',
                severity: 'high',
                message: `Circular dependencies detected: ${circularDeps.join(', ')}. This can cause issues.`
            });
        }
        
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
        // Simple circular dependency detection
        const circles = [];
        const graph = {};
        
        // Build graph
        dependencies.forEach(dep => {
            if (!graph[dep.from]) graph[dep.from] = [];
            graph[dep.from].push(dep.to);
        });
        
        // Check for cycles (simplified)
        for (const node in graph) {
            const visited = new Set();
            const stack = [node];
            
            while (stack.length > 0) {
                const current = stack.pop();
                if (visited.has(current)) {
                    circles.push(`${node} -> ... -> ${current}`);
                    break;
                }
                visited.add(current);
                if (graph[current]) {
                    stack.push(...graph[current]);
                }
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

        let report = `Agent System Analysis Report\n`;
        report += `===========================\n\n`;
        
        // Summary
        report += `Summary:\n`;
        report += `--------\n`;
        report += `Total Agents: ${analysis.summary.totalAgents}\n`;
        report += `Total Size: ${formatFileSize(analysis.summary.totalSize)}\n`;
        report += `Average Size: ${formatFileSize(analysis.summary.avgSize)}\n\n`;
        
        // Type distribution
        report += `Agent Types:\n`;
        report += `-----------\n`;
        for (const [type, count] of Object.entries(analysis.summary.types).sort((a, b) => b[1] - a[1])) {
            const percent = ((count / analysis.summary.totalAgents) * 100).toFixed(1);
            report += `${type}: ${count} (${percent}%)\n`;
        }
        report += '\n';
        
        // Priority distribution
        report += `Priority Levels:\n`;
        report += `---------------\n`;
        for (const [priority, count] of Object.entries(analysis.summary.priorities)) {
            const percent = ((count / analysis.summary.totalAgents) * 100).toFixed(1);
            report += `${priority}: ${count} (${percent}%)\n`;
        }
        report += '\n';
        
        // Tool usage
        report += `Most Used Tools:\n`;
        report += `---------------\n`;
        const sortedTools = Object.entries(analysis.toolUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        for (const [tool, count] of sortedTools) {
            report += `${tool}: ${count} agents\n`;
        }
        report += '\n';
        
        // Security analysis
        report += `Security Analysis:\n`;
        report += `-----------------\n`;
        report += `Sandboxed: ${analysis.securityAnalysis.sandboxed}\n`;
        report += `Not Sandboxed: ${analysis.securityAnalysis.unsandboxed}\n\n`;
        
        // Performance analysis
        report += `Performance Analysis:\n`;
        report += `--------------------\n`;
        report += `Parallel Execution Enabled: ${analysis.performanceAnalysis.parallelEnabled}\n`;
        report += `Batching Enabled: ${analysis.performanceAnalysis.batchingEnabled}\n\n`;
        
        // Recommendations
        if (analysis.recommendations.length > 0) {
            report += `Recommendations:\n`;
            report += `---------------\n`;
            for (const rec of analysis.recommendations) {
                report += `[${rec.severity.toUpperCase()}] ${rec.type}: ${rec.message}\n`;
            }
        }
        
        return report;
    }
}