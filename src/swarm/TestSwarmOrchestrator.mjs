import { SwarmCoordinator } from './coordinators/SwarmCoordinator.mjs';
import { SequentialSubagent } from './agents/SequentialSubagent.mjs';
import { AgentValidator } from '../validator.mjs';
import { AgentFixer } from '../fixer.mjs';
import { AgentAnalyzer } from '../analyzer.mjs';
import { AgentCreator } from '../creator.mjs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Production-grade Test Swarm Orchestrator
 * Coordinates multiple swarms to fix test failures concurrently without conflicts
 */
export class TestSwarmOrchestrator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.testDir = path.join(this.projectRoot, 'test');
        this.srcDir = path.join(this.projectRoot, 'src');
        this.coordinator = null;
        this.swarms = new Map();
        this.subagents = new Map();
        this.testResults = null;
        this.fixStrategies = new Map();
        this.conflictRules = [];
        this.state = 'INITIALIZED';
        this.metrics = {
            totalTests: 0,
            failedTests: 0,
            fixedTests: 0,
            inProgressTests: 0,
            conflictsPrevented: 0,
            consensusDecisions: 0,
            executionTime: 0
        };
    }
    
    /**
     * Initialize test swarm orchestrator
     */
    async initialize() {
        console.log('🚀 Initializing Test Swarm Orchestrator with Byzantine Consensus...');
        
        // Create swarm coordinator
        this.coordinator = new SwarmCoordinator({
            swarmId: 'test-fixer-main',
            maxSwarms: 5,
            conflictDetection: true,
            executionMode: 'hybrid'
        });
        
        await this.coordinator.initialize();
        
        // Set up conflict prevention rules
        this.setupConflictRules();
        
        // Listen to coordinator events
        this.setupCoordinatorListeners();
        
        this.state = 'READY';
        console.log('✅ Test Swarm Orchestrator initialized');
    }
    
    /**
     * Set up conflict prevention rules
     */
    setupConflictRules() {
        this.conflictRules = [
            {
                type: 'EXCLUSIVE_ACCESS',
                name: 'Source File Lock',
                resources: ['src-file-write'],
                description: 'Only one agent can modify source files at a time'
            },
            {
                type: 'SEQUENTIAL_ORDERING',
                name: 'Test Dependency Order',
                taskTypes: ['module-export-fix', 'import-resolution'],
                description: 'Module fixes must complete before import fixes'
            },
            {
                type: 'RATE_LIMIT',
                name: 'File System Operations',
                taskTypes: ['file-write', 'file-create'],
                window: 1000,
                maxCount: 10,
                description: 'Limit concurrent file operations'
            }
        ];
    }
    
    /**
     * Set up event listeners
     */
    setupCoordinatorListeners() {
        this.coordinator.on('task-completed', ({ task, agent }) => {
            console.log(`✅ Task completed: ${task.name} by ${agent.name}`);
            this.metrics.fixedTests++;
        });
        
        this.coordinator.on('task-failed', ({ task, agent, error }) => {
            console.error(`❌ Task failed: ${task.name} - ${error.message}`);
        });
        
        this.coordinator.on('consensus-reached', ({ value, votes }) => {
            console.log(`🤝 Consensus reached with ${votes} votes`);
            this.metrics.consensusDecisions++;
        });
        
        this.coordinator.on('conflict-resolved', ({ task, resolution }) => {
            console.log(`🔧 Conflict resolved for ${task.name}: ${resolution.strategy}`);
            this.metrics.conflictsPrevented++;
        });
    }
    
    /**
     * Analyze test failures and create fix strategies
     */
    async analyzeTestFailures() {
        console.log('🔍 Analyzing test failures...');
        
        // Run tests to get current failures
        const testOutput = await this.runTests();
        this.testResults = this.parseTestResults(testOutput);
        
        this.metrics.totalTests = this.testResults.total;
        this.metrics.failedTests = this.testResults.failed.length;
        
        console.log(`📊 Found ${this.testResults.failed.length} failing tests out of ${this.testResults.total}`);
        
        // Analyze each failure and create fix strategy
        for (const failure of this.testResults.failed) {
            const strategy = await this.createFixStrategy(failure);
            this.fixStrategies.set(failure.testId, strategy);
        }
        
        return this.testResults;
    }
    
    /**
     * Run tests and capture output
     */
    async runTests() {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const { stdout, stderr } = await execAsync('npm test', {
                cwd: this.projectRoot,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });
            
            return { stdout, stderr };
        } catch (error) {
            // Tests failed, but we have the output
            return { 
                stdout: error.stdout || '', 
                stderr: error.stderr || error.message 
            };
        }
    }
    
    /**
     * Parse test results from output
     */
    parseTestResults(output) {
        const results = {
            total: 0,
            passed: [],
            failed: [],
            skipped: []
        };
        
        // Parse test output (assuming vitest format)
        const lines = (output.stdout + output.stderr).split('\n');
        let currentFile = null;
        let currentTest = null;
        
        for (const line of lines) {
            // Match test file
            if (line.includes('test/') && line.includes('.test.mjs')) {
                currentFile = line.trim().split(' ')[0];
            }
            
            // Match failed test
            if (line.includes('✗') || line.includes('FAIL')) {
                const testMatch = line.match(/✗\s+(.+)/);
                if (testMatch) {
                    const failure = {
                        testId: `${currentFile}:${testMatch[1]}`,
                        file: currentFile,
                        testName: testMatch[1],
                        error: '',
                        line: null
                    };
                    
                    // Collect error details from subsequent lines
                    let errorLines = [];
                    let i = lines.indexOf(line) + 1;
                    while (i < lines.length && lines[i].startsWith('  ')) {
                        errorLines.push(lines[i].trim());
                        i++;
                    }
                    failure.error = errorLines.join('\n');
                    
                    results.failed.push(failure);
                }
            }
            
            // Match test summary
            if (line.includes('Tests:')) {
                const match = line.match(/(\d+) failed.*(\d+) passed.*(\d+) total/);
                if (match) {
                    results.total = parseInt(match[3]);
                }
            }
        }
        
        return results;
    }
    
    /**
     * Create fix strategy for test failure
     */
    async createFixStrategy(failure) {
        const strategy = {
            testId: failure.testId,
            file: failure.file,
            testName: failure.testName,
            error: failure.error,
            fixType: 'unknown',
            tasks: [],
            priority: 'medium',
            dependencies: []
        };
        
        // Analyze error to determine fix type
        if (failure.error.includes('Cannot find module') || 
            failure.error.includes('Module not found')) {
            strategy.fixType = 'missing-import';
            strategy.priority = 'high';
            strategy.tasks = [
                {
                    type: 'module-export-fix',
                    target: this.extractModulePath(failure.error),
                    action: 'create-export'
                },
                {
                    type: 'import-resolution',
                    target: failure.file,
                    action: 'fix-import'
                }
            ];
        } else if (failure.error.includes('is not a function') ||
                   failure.error.includes('is not defined')) {
            strategy.fixType = 'missing-method';
            strategy.priority = 'high';
            strategy.tasks = [
                {
                    type: 'method-implementation',
                    target: this.extractMethodName(failure.error),
                    action: 'implement-method'
                }
            ];
        } else if (failure.error.includes('Expected') && 
                   failure.error.includes('Received')) {
            strategy.fixType = 'assertion-mismatch';
            strategy.priority = 'medium';
            strategy.tasks = [
                {
                    type: 'test-assertion-fix',
                    target: failure.testName,
                    action: 'update-assertion'
                }
            ];
        } else if (failure.error.includes('No test suite found')) {
            strategy.fixType = 'empty-test-file';
            strategy.priority = 'low';
            strategy.tasks = [
                {
                    type: 'test-creation',
                    target: failure.file,
                    action: 'create-test-suite'
                }
            ];
        }
        
        return strategy;
    }
    
    /**
     * Deploy swarms to fix tests
     */
    async deploySwarms() {
        console.log('🐝 Deploying test fixing swarms...');
        
        const startTime = Date.now();
        
        // Create specialized swarms
        await this.createSpecializedSwarms();
        
        // Distribute tasks to swarms
        await this.distributeTasksToSwarms();
        
        // Start execution
        await this.startSwarmExecution();
        
        // Monitor progress
        await this.monitorProgress();
        
        this.metrics.executionTime = Date.now() - startTime;
        
        console.log(`✅ Test fixing completed in ${this.metrics.executionTime}ms`);
    }
    
    /**
     * Create specialized swarms for different fix types
     */
    async createSpecializedSwarms() {
        // Module fixing swarm
        const moduleSwarm = await this.coordinator.createSwarm({
            name: 'Module Fix Swarm',
            type: 'module-fixer',
            maxAgents: 3
        });
        
        // Test fixing swarm
        const testSwarm = await this.coordinator.createSwarm({
            name: 'Test Fix Swarm',
            type: 'test-fixer',
            maxAgents: 3
        });
        
        // Import resolution swarm
        const importSwarm = await this.coordinator.createSwarm({
            name: 'Import Fix Swarm',
            type: 'import-fixer',
            maxAgents: 2
        });
        
        this.swarms.set('module-fixer', moduleSwarm);
        this.swarms.set('test-fixer', testSwarm);
        this.swarms.set('import-fixer', importSwarm);
        
        // Create agents for each swarm
        await this.createSwarmAgents();
    }
    
    /**
     * Create agents for swarms
     */
    async createSwarmAgents() {
        // Module fixer agents
        const moduleSwarm = this.swarms.get('module-fixer');
        for (let i = 0; i < 3; i++) {
            const agent = new SequentialSubagent({
                name: `Module Fixer ${i + 1}`,
                type: 'module-fixer',
                parentSwarmId: moduleSwarm.id,
                capabilities: ['export-fix', 'method-implementation'],
                conflictPreventionRules: this.conflictRules
            });
            
            await agent.initialize();
            this.subagents.set(agent.id, agent);
            
            await this.coordinator.addAgentToSwarm(moduleSwarm.id, {
                id: agent.id,
                name: agent.name,
                type: agent.type,
                capabilities: agent.capabilities
            });
        }
        
        // Test fixer agents
        const testSwarm = this.swarms.get('test-fixer');
        for (let i = 0; i < 3; i++) {
            const agent = new SequentialSubagent({
                name: `Test Fixer ${i + 1}`,
                type: 'test-fixer',
                parentSwarmId: testSwarm.id,
                capabilities: ['test-creation', 'assertion-fix'],
                conflictPreventionRules: this.conflictRules
            });
            
            await agent.initialize();
            this.subagents.set(agent.id, agent);
            
            await this.coordinator.addAgentToSwarm(testSwarm.id, {
                id: agent.id,
                name: agent.name,
                type: agent.type,
                capabilities: agent.capabilities
            });
        }
    }
    
    /**
     * Distribute tasks to appropriate swarms
     */
    async distributeTasksToSwarms() {
        for (const [testId, strategy] of this.fixStrategies) {
            for (const task of strategy.tasks) {
                let targetSwarm;
                
                // Route to appropriate swarm
                switch (task.type) {
                    case 'module-export-fix':
                    case 'method-implementation':
                        targetSwarm = this.swarms.get('module-fixer');
                        break;
                        
                    case 'test-creation':
                    case 'test-assertion-fix':
                        targetSwarm = this.swarms.get('test-fixer');
                        break;
                        
                    case 'import-resolution':
                        targetSwarm = this.swarms.get('import-fixer');
                        break;
                }
                
                if (targetSwarm) {
                    await this.coordinator.submitTask({
                        name: `Fix: ${testId}`,
                        type: task.type,
                        swarmId: targetSwarm.id,
                        resources: this.getTaskResources(task),
                        dependencies: strategy.dependencies,
                        priority: strategy.priority,
                        metadata: {
                            testId,
                            task,
                            strategy
                        }
                    });
                }
            }
        }
    }
    
    /**
     * Get resources required by task
     */
    getTaskResources(task) {
        const resources = [];
        
        if (task.type.includes('module') || task.type.includes('method')) {
            resources.push('src-file-write');
            resources.push(`file:${task.target}`);
        }
        
        if (task.type.includes('test')) {
            resources.push('test-file-write');
            resources.push(`test:${task.target}`);
        }
        
        return resources;
    }
    
    /**
     * Start swarm execution
     */
    async startSwarmExecution() {
        console.log('🚀 Starting concurrent swarm execution...');
        
        // The coordinator handles execution automatically
        // We just need to wait and monitor
    }
    
    /**
     * Monitor execution progress
     */
    async monitorProgress() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const state = this.coordinator.getState();
                
                console.log(`📊 Progress: ${state.tasks.completed}/${state.tasks.total} tasks completed`);
                
                if (state.tasks.completed + state.tasks.failed === state.tasks.total) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 1000);
        });
    }
    
    /**
     * Extract module path from error
     */
    extractModulePath(error) {
        const match = error.match(/Cannot find module '(.+?)'/);
        return match ? match[1] : 'unknown';
    }
    
    /**
     * Extract method name from error
     */
    extractMethodName(error) {
        const match = error.match(/(\w+) is not a function/);
        return match ? match[1] : 'unknown';
    }
    
    /**
     * Get final report
     */
    getReport() {
        const state = this.coordinator.getState();
        
        return {
            summary: {
                totalTests: this.metrics.totalTests,
                failedTests: this.metrics.failedTests,
                fixedTests: this.metrics.fixedTests,
                successRate: (this.metrics.fixedTests / this.metrics.failedTests * 100).toFixed(2) + '%',
                executionTime: this.metrics.executionTime + 'ms'
            },
            swarms: state.swarms,
            agents: state.agents,
            consensus: {
                decisions: this.metrics.consensusDecisions,
                conflictsPrevented: this.metrics.conflictsPrevented
            },
            tasks: state.tasks,
            coordinatorMetrics: state.metrics
        };
    }
}

export default TestSwarmOrchestrator;