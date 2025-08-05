import { EventEmitter } from 'events';

/**
 * Production-grade Sequential Subagent
 * Executes tasks in sequence with conflict prevention
 */
export class SequentialSubagent extends EventEmitter {
    constructor(options = {}) {
        super();
        this.id = options.id || `subagent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.name = options.name || 'Sequential Subagent';
        this.type = options.type || 'sequential';
        this.parentSwarmId = options.parentSwarmId;
        this.capabilities = options.capabilities || [];
        this.taskQueue = [];
        this.currentTask = null;
        this.state = 'IDLE'; // IDLE, WORKING, WAITING, ERROR
        this.executionHistory = [];
        this.resourceRegistry = new Map();
        this.dependencyGraph = new Map();
        this.conflictPreventionRules = options.conflictPreventionRules || [];
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 30000;
        this.metrics = {
            tasksCompleted: 0,
            tasksFailed: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            conflictsPrevented: 0,
            retriesUsed: 0
        };
    }
    
    /**
     * Initialize subagent
     */
    async initialize() {
        this.state = 'IDLE';
        this.emit('initialized', { id: this.id, name: this.name });
    }
    
    /**
     * Add task to queue with conflict checking
     */
    async queueTask(task) {
        const taskData = {
            id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: task.name,
            type: task.type,
            action: task.action,
            params: task.params || {},
            resources: task.resources || [],
            dependencies: task.dependencies || [],
            priority: task.priority || 'medium',
            maxRetries: task.maxRetries || this.maxRetries,
            timeout: task.timeout || this.timeout,
            state: 'QUEUED',
            attempts: 0,
            created: Date.now(),
            started: null,
            completed: null,
            result: null,
            error: null
        };
        
        // Check for conflicts before queuing
        const conflicts = await this.checkConflicts(taskData);
        if (conflicts.length > 0) {
            taskData.state = 'BLOCKED';
            taskData.blockedBy = conflicts;
            this.emit('task-blocked', { task: taskData, conflicts });
        }
        
        // Add to dependency graph
        this.updateDependencyGraph(taskData);
        
        // Insert based on priority
        this.insertTaskByPriority(taskData);
        
        this.emit('task-queued', taskData);
        
        // Process queue if idle
        if (this.state === 'IDLE') {
            await this.processNextTask();
        }
        
        return taskData;
    }
    
    /**
     * Check for conflicts with existing tasks
     */
    async checkConflicts(task) {
        const conflicts = [];
        
        // Check resource conflicts
        for (const resource of task.resources) {
            const currentOwner = this.resourceRegistry.get(resource);
            if (currentOwner && currentOwner !== task.id) {
                conflicts.push({
                    type: 'RESOURCE_CONFLICT',
                    resource,
                    ownedBy: currentOwner,
                    severity: 'HIGH'
                });
            }
        }
        
        // Check dependency conflicts
        for (const dep of task.dependencies) {
            const depTask = this.findTaskById(dep);
            if (depTask && depTask.state !== 'COMPLETED') {
                conflicts.push({
                    type: 'DEPENDENCY_NOT_MET',
                    dependency: dep,
                    currentState: depTask?.state || 'NOT_FOUND',
                    severity: 'MEDIUM'
                });
            }
        }
        
        // Apply custom conflict prevention rules
        for (const rule of this.conflictPreventionRules) {
            const ruleConflicts = await this.applyConflictRule(rule, task);
            conflicts.push(...ruleConflicts);
        }
        
        return conflicts;
    }
    
    /**
     * Apply custom conflict prevention rule
     */
    async applyConflictRule(rule, task) {
        const conflicts = [];
        
        switch (rule.type) {
            case 'EXCLUSIVE_ACCESS':
                // Check if any task is accessing the exclusive resource
                if (rule.resources.some(r => task.resources.includes(r))) {
                    const activeTask = this.findActiveTaskWithResource(rule.resources);
                    if (activeTask) {
                        conflicts.push({
                            type: 'EXCLUSIVE_ACCESS_VIOLATION',
                            rule: rule.name,
                            blockedBy: activeTask.id,
                            severity: 'HIGH'
                        });
                    }
                }
                break;
                
            case 'SEQUENTIAL_ORDERING':
                // Ensure tasks of certain types run sequentially
                if (rule.taskTypes.includes(task.type)) {
                    const runningTask = this.findRunningTaskOfType(rule.taskTypes);
                    if (runningTask) {
                        conflicts.push({
                            type: 'SEQUENTIAL_ORDERING_VIOLATION',
                            rule: rule.name,
                            mustWaitFor: runningTask.id,
                            severity: 'MEDIUM'
                        });
                    }
                }
                break;
                
            case 'RATE_LIMIT':
                // Check rate limiting rules
                const recentTasks = this.getRecentTasksOfType(task.type, rule.window);
                if (recentTasks.length >= rule.maxCount) {
                    conflicts.push({
                        type: 'RATE_LIMIT_EXCEEDED',
                        rule: rule.name,
                        current: recentTasks.length,
                        limit: rule.maxCount,
                        severity: 'LOW'
                    });
                }
                break;
        }
        
        return conflicts;
    }
    
    /**
     * Update dependency graph
     */
    updateDependencyGraph(task) {
        this.dependencyGraph.set(task.id, {
            task,
            dependencies: new Set(task.dependencies),
            dependents: new Set()
        });
        
        // Update dependents for dependencies
        for (const dep of task.dependencies) {
            const depNode = this.dependencyGraph.get(dep);
            if (depNode) {
                depNode.dependents.add(task.id);
            }
        }
    }
    
    /**
     * Insert task by priority
     */
    insertTaskByPriority(task) {
        const priorityWeights = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1
        };
        
        const weight = priorityWeights[task.priority] || 2;
        
        // Find insertion point
        let insertIndex = this.taskQueue.length;
        for (let i = 0; i < this.taskQueue.length; i++) {
            const queuedWeight = priorityWeights[this.taskQueue[i].priority] || 2;
            if (weight > queuedWeight) {
                insertIndex = i;
                break;
            }
        }
        
        this.taskQueue.splice(insertIndex, 0, task);
    }
    
    /**
     * Process next task in queue
     */
    async processNextTask() {
        if (this.state !== 'IDLE' || this.taskQueue.length === 0) {
            return;
        }
        
        // Find next executable task
        let nextTask = null;
        for (let i = 0; i < this.taskQueue.length; i++) {
            const task = this.taskQueue[i];
            const conflicts = await this.checkConflicts(task);
            
            if (conflicts.length === 0) {
                nextTask = task;
                this.taskQueue.splice(i, 1);
                break;
            } else {
                // Update blocked status
                task.state = 'BLOCKED';
                task.blockedBy = conflicts;
            }
        }
        
        if (!nextTask) {
            // No executable tasks, check for deadlocks
            await this.checkDeadlocks();
            return;
        }
        
        await this.executeTask(nextTask);
    }
    
    /**
     * Execute task with retry logic
     */
    async executeTask(task) {
        this.currentTask = task;
        this.state = 'WORKING';
        task.state = 'EXECUTING';
        task.started = Date.now();
        task.attempts++;
        
        // Acquire resources
        await this.acquireResources(task);
        
        this.emit('task-started', task);
        
        try {
            // Set timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Task timeout')), task.timeout);
            });
            
            // Execute task action
            const executionPromise = this.executeTaskAction(task);
            
            // Race between execution and timeout
            const result = await Promise.race([executionPromise, timeoutPromise]);
            
            // Task completed successfully
            task.state = 'COMPLETED';
            task.completed = Date.now();
            task.result = result;
            
            // Update metrics
            const executionTime = task.completed - task.started;
            this.metrics.tasksCompleted++;
            this.metrics.totalExecutionTime += executionTime;
            this.metrics.averageExecutionTime = 
                this.metrics.totalExecutionTime / this.metrics.tasksCompleted;
            
            // Add to execution history
            this.executionHistory.push({
                taskId: task.id,
                name: task.name,
                executionTime,
                result: 'success',
                timestamp: task.completed
            });
            
            this.emit('task-completed', task);
            
            // Notify dependents
            await this.notifyDependents(task);
            
        } catch (error) {
            task.error = error.message;
            
            if (task.attempts < task.maxRetries) {
                // Retry task
                task.state = 'QUEUED';
                this.metrics.retriesUsed++;
                this.taskQueue.unshift(task); // Add to front of queue
                this.emit('task-retry', { task, error, attempt: task.attempts });
            } else {
                // Task failed permanently
                task.state = 'FAILED';
                task.completed = Date.now();
                this.metrics.tasksFailed++;
                
                this.executionHistory.push({
                    taskId: task.id,
                    name: task.name,
                    executionTime: task.completed - task.started,
                    result: 'failed',
                    error: error.message,
                    timestamp: task.completed
                });
                
                this.emit('task-failed', { task, error });
            }
        } finally {
            // Release resources
            await this.releaseResources(task);
            
            // Reset state
            this.currentTask = null;
            this.state = 'IDLE';
            
            // Process next task
            await this.processNextTask();
        }
    }
    
    /**
     * Execute task action (simulated for now)
     */
    async executeTaskAction(task) {
        // In production, this would execute actual task logic
        // For now, we'll simulate different task types
        
        switch (task.type) {
            case 'test-fix':
                return await this.executeTestFix(task);
                
            case 'module-repair':
                return await this.executeModuleRepair(task);
                
            case 'dependency-update':
                return await this.executeDependencyUpdate(task);
                
            default:
                // Simulate generic execution
                await new Promise(resolve => 
                    setTimeout(resolve, Math.random() * 1000 + 500)
                );
                return { success: true, taskId: task.id };
        }
    }
    
    /**
     * Execute test fix task
     */
    async executeTestFix(task) {
        const { testFile, testName, fixType } = task.params;
        
        // Simulate test fixing logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            testFile,
            testName,
            fixApplied: fixType,
            timestamp: Date.now()
        };
    }
    
    /**
     * Execute module repair task
     */
    async executeModuleRepair(task) {
        const { modulePath, repairType } = task.params;
        
        // Simulate module repair
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
            success: true,
            modulePath,
            repairType,
            timestamp: Date.now()
        };
    }
    
    /**
     * Execute dependency update task
     */
    async executeDependencyUpdate(task) {
        const { dependencies } = task.params;
        
        // Simulate dependency update
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return {
            success: true,
            updated: dependencies,
            timestamp: Date.now()
        };
    }
    
    /**
     * Acquire resources for task
     */
    async acquireResources(task) {
        for (const resource of task.resources) {
            this.resourceRegistry.set(resource, task.id);
        }
        
        this.emit('resources-acquired', { task, resources: task.resources });
    }
    
    /**
     * Release resources after task
     */
    async releaseResources(task) {
        for (const resource of task.resources) {
            if (this.resourceRegistry.get(resource) === task.id) {
                this.resourceRegistry.delete(resource);
            }
        }
        
        this.emit('resources-released', { task, resources: task.resources });
    }
    
    /**
     * Notify dependent tasks
     */
    async notifyDependents(completedTask) {
        const node = this.dependencyGraph.get(completedTask.id);
        if (!node) return;
        
        for (const dependentId of node.dependents) {
            const dependent = this.findTaskById(dependentId);
            if (dependent && dependent.state === 'BLOCKED') {
                // Re-check if task can now be executed
                const conflicts = await this.checkConflicts(dependent);
                if (conflicts.length === 0) {
                    dependent.state = 'QUEUED';
                    dependent.blockedBy = null;
                    this.emit('task-unblocked', dependent);
                }
            }
        }
    }
    
    /**
     * Check for deadlocks in task queue
     */
    async checkDeadlocks() {
        const blockedTasks = this.taskQueue.filter(t => t.state === 'BLOCKED');
        
        if (blockedTasks.length === this.taskQueue.length && blockedTasks.length > 0) {
            // All tasks are blocked - potential deadlock
            const deadlockInfo = {
                blockedTasks: blockedTasks.map(t => ({
                    id: t.id,
                    name: t.name,
                    blockedBy: t.blockedBy
                })),
                detected: Date.now()
            };
            
            this.emit('deadlock-detected', deadlockInfo);
            
            // Attempt resolution
            await this.resolveDeadlock(blockedTasks);
        }
    }
    
    /**
     * Attempt to resolve deadlock
     */
    async resolveDeadlock(blockedTasks) {
        // Find task with lowest priority dependencies
        let bestCandidate = null;
        let lowestDependencyCount = Infinity;
        
        for (const task of blockedTasks) {
            const depCount = task.dependencies.length;
            if (depCount < lowestDependencyCount) {
                lowestDependencyCount = depCount;
                bestCandidate = task;
            }
        }
        
        if (bestCandidate) {
            // Force execute with warning
            bestCandidate.state = 'QUEUED';
            bestCandidate.blockedBy = null;
            bestCandidate.forcedExecution = true;
            
            this.emit('deadlock-resolved', { 
                method: 'force-execution',
                task: bestCandidate 
            });
        }
    }
    
    /**
     * Find task by ID
     */
    findTaskById(taskId) {
        if (this.currentTask?.id === taskId) {
            return this.currentTask;
        }
        
        return this.taskQueue.find(t => t.id === taskId) ||
               this.executionHistory.find(h => h.taskId === taskId)?.task;
    }
    
    /**
     * Find active task with resource
     */
    findActiveTaskWithResource(resources) {
        if (this.currentTask) {
            const hasResource = resources.some(r => 
                this.currentTask.resources.includes(r)
            );
            if (hasResource) {
                return this.currentTask;
            }
        }
        return null;
    }
    
    /**
     * Find running task of type
     */
    findRunningTaskOfType(types) {
        if (this.currentTask && types.includes(this.currentTask.type)) {
            return this.currentTask;
        }
        return null;
    }
    
    /**
     * Get recent tasks of type
     */
    getRecentTasksOfType(type, windowMs) {
        const cutoff = Date.now() - windowMs;
        return this.executionHistory.filter(h => 
            h.timestamp > cutoff &&
            h.task?.type === type
        );
    }
    
    /**
     * Get subagent state
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            state: this.state,
            currentTask: this.currentTask ? {
                id: this.currentTask.id,
                name: this.currentTask.name,
                state: this.currentTask.state,
                attempts: this.currentTask.attempts
            } : null,
            queueLength: this.taskQueue.length,
            blockedTasks: this.taskQueue.filter(t => t.state === 'BLOCKED').length,
            resourcesInUse: Array.from(this.resourceRegistry.keys()),
            metrics: this.metrics,
            executionHistorySize: this.executionHistory.length
        };
    }
}

export default SequentialSubagent;