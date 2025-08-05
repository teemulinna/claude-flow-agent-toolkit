import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Production-grade Byzantine Consensus Coordinator
 * Implements PBFT (Practical Byzantine Fault Tolerance) for distributed test coordination
 */
export class ByzantineConsensus extends EventEmitter {
    constructor(options = {}) {
        super();
        this.nodeId = options.nodeId || crypto.randomBytes(16).toString('hex');
        this.nodes = new Map();
        this.state = new Map();
        this.view = 0;
        this.isPrimary = false;
        this.phase = 'IDLE'; // IDLE, PRE_PREPARE, PREPARE, COMMIT, REPLY
        this.faultThreshold = options.faultThreshold || 0.33;
        this.timeout = options.timeout || 5000;
        this.sequenceNumber = 0;
        this.preparedMessages = new Map();
        this.committedMessages = new Map();
        this.messageLog = [];
        this.consensusReached = false;
        this.votingRecord = new Map();
        
        // Cryptographic components for message authentication
        this.signatures = new Map();
        this.publicKeys = new Map();
    }
    
    /**
     * Initialize consensus node
     */
    async initialize(nodes) {
        this.nodes = new Map(nodes.map(n => [n.id, n]));
        this.isPrimary = this.determinePrimary();
        this.emit('initialized', { nodeId: this.nodeId, isPrimary: this.isPrimary });
    }
    
    /**
     * Determine primary node based on view
     */
    determinePrimary() {
        const nodeIds = Array.from(this.nodes.keys()).sort();
        const primaryIndex = this.view % nodeIds.length;
        return nodeIds[primaryIndex] === this.nodeId;
    }
    
    /**
     * Calculate required votes for consensus (2f + 1 where f is fault tolerance)
     */
    getRequiredVotes() {
        const totalNodes = this.nodes.size;
        const maxFaults = Math.floor(totalNodes * this.faultThreshold);
        return 2 * maxFaults + 1;
    }
    
    /**
     * Propose a value for consensus
     */
    async propose(value, metadata = {}) {
        if (!this.isPrimary) {
            throw new Error('Only primary can propose values');
        }
        
        this.sequenceNumber++;
        const proposal = {
            view: this.view,
            sequence: this.sequenceNumber,
            value,
            metadata,
            nodeId: this.nodeId,
            timestamp: Date.now(),
            digest: this.createDigest(value)
        };
        
        // Sign the proposal
        proposal.signature = this.signMessage(proposal);
        
        // Start pre-prepare phase
        this.phase = 'PRE_PREPARE';
        await this.broadcast('PRE_PREPARE', proposal);
        
        // Store our own pre-prepare
        this.storeMessage('PRE_PREPARE', proposal);
        
        return proposal;
    }
    
    /**
     * Handle incoming consensus messages
     */
    async handleMessage(type, message, senderId) {
        // Verify message signature
        if (!this.verifySignature(message, senderId)) {
            this.emit('invalid-signature', { type, senderId });
            return;
        }
        
        // Store message in log
        this.messageLog.push({ type, message, senderId, timestamp: Date.now() });
        
        switch (type) {
            case 'PRE_PREPARE':
                await this.handlePrePrepare(message, senderId);
                break;
            case 'PREPARE':
                await this.handlePrepare(message, senderId);
                break;
            case 'COMMIT':
                await this.handleCommit(message, senderId);
                break;
            case 'VIEW_CHANGE':
                await this.handleViewChange(message, senderId);
                break;
            default:
                this.emit('unknown-message', { type, senderId });
        }
    }
    
    /**
     * Handle pre-prepare phase
     */
    async handlePrePrepare(message, senderId) {
        // Verify sender is primary
        const expectedPrimary = this.determinePrimary();
        if (senderId !== expectedPrimary) {
            this.emit('invalid-primary', { senderId, expectedPrimary });
            return;
        }
        
        // Verify sequence number is valid
        if (message.sequence <= this.getLastCommittedSequence()) {
            this.emit('old-sequence', { sequence: message.sequence });
            return;
        }
        
        // Store pre-prepare
        this.storeMessage('PRE_PREPARE', message);
        
        // Move to prepare phase
        this.phase = 'PREPARE';
        const prepareMessage = {
            view: message.view,
            sequence: message.sequence,
            digest: message.digest,
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
        
        prepareMessage.signature = this.signMessage(prepareMessage);
        await this.broadcast('PREPARE', prepareMessage);
        
        // Store our own prepare
        this.storeMessage('PREPARE', prepareMessage);
    }
    
    /**
     * Handle prepare phase
     */
    async handlePrepare(message, senderId) {
        this.storeMessage('PREPARE', message);
        
        const key = `${message.view}-${message.sequence}`;
        const prepares = this.getPrepareCount(key);
        const required = this.getRequiredVotes();
        
        if (prepares >= required && !this.preparedMessages.has(key)) {
            // Prepared predicate is true
            this.preparedMessages.set(key, true);
            this.phase = 'COMMIT';
            
            const commitMessage = {
                view: message.view,
                sequence: message.sequence,
                digest: message.digest,
                nodeId: this.nodeId,
                timestamp: Date.now()
            };
            
            commitMessage.signature = this.signMessage(commitMessage);
            await this.broadcast('COMMIT', commitMessage);
            
            // Store our own commit
            this.storeMessage('COMMIT', commitMessage);
        }
    }
    
    /**
     * Handle commit phase
     */
    async handleCommit(message, senderId) {
        this.storeMessage('COMMIT', message);
        
        const key = `${message.view}-${message.sequence}`;
        const commits = this.getCommitCount(key);
        const required = this.getRequiredVotes();
        
        if (commits >= required && !this.committedMessages.has(key)) {
            // Committed predicate is true
            this.committedMessages.set(key, message);
            this.consensusReached = true;
            this.phase = 'REPLY';
            
            // Execute the agreed value
            const proposal = this.getProposal(message.view, message.sequence);
            if (proposal) {
                await this.executeConsensus(proposal.value, proposal.metadata);
                this.emit('consensus-reached', { 
                    value: proposal.value, 
                    sequence: message.sequence,
                    votes: commits
                });
            }
        }
    }
    
    /**
     * Handle view change (leader election)
     */
    async handleViewChange(message, senderId) {
        const viewChangeKey = `view-${message.newView}`;
        
        if (!this.votingRecord.has(viewChangeKey)) {
            this.votingRecord.set(viewChangeKey, new Set());
        }
        
        this.votingRecord.get(viewChangeKey).add(senderId);
        
        const votes = this.votingRecord.get(viewChangeKey).size;
        const required = this.getRequiredVotes();
        
        if (votes >= required) {
            // View change successful
            this.view = message.newView;
            this.isPrimary = this.determinePrimary();
            this.phase = 'IDLE';
            
            this.emit('view-changed', { 
                newView: this.view, 
                isPrimary: this.isPrimary,
                votes 
            });
        }
    }
    
    /**
     * Execute consensus decision
     */
    async executeConsensus(value, metadata) {
        // This is where the actual action happens
        this.state.set(metadata.taskId || 'default', {
            value,
            metadata,
            timestamp: Date.now(),
            consensus: true
        });
        
        this.emit('execute', { value, metadata });
    }
    
    /**
     * Broadcast message to all nodes
     */
    async broadcast(type, message) {
        const promises = [];
        
        for (const [nodeId, node] of this.nodes) {
            if (nodeId !== this.nodeId) {
                promises.push(this.sendToNode(nodeId, type, message));
            }
        }
        
        await Promise.allSettled(promises);
    }
    
    /**
     * Send message to specific node
     */
    async sendToNode(nodeId, type, message) {
        // In production, this would use actual network communication
        // For now, we'll emit an event that can be handled by the coordinator
        this.emit('send-message', { 
            to: nodeId, 
            from: this.nodeId, 
            type, 
            message 
        });
    }
    
    /**
     * Store message for counting
     */
    storeMessage(type, message) {
        const key = `${type}-${message.view}-${message.sequence}`;
        
        if (!this.state.has(key)) {
            this.state.set(key, []);
        }
        
        this.state.get(key).push(message);
    }
    
    /**
     * Count prepare messages
     */
    getPrepareCount(key) {
        const prepareKey = `PREPARE-${key}`;
        return this.state.get(prepareKey)?.length || 0;
    }
    
    /**
     * Count commit messages
     */
    getCommitCount(key) {
        const commitKey = `COMMIT-${key}`;
        return this.state.get(commitKey)?.length || 0;
    }
    
    /**
     * Get proposal by view and sequence
     */
    getProposal(view, sequence) {
        const key = `PRE_PREPARE-${view}-${sequence}`;
        const proposals = this.state.get(key);
        return proposals?.[0];
    }
    
    /**
     * Get last committed sequence number
     */
    getLastCommittedSequence() {
        let maxSequence = 0;
        
        for (const [key] of this.committedMessages) {
            const [, sequence] = key.split('-');
            maxSequence = Math.max(maxSequence, parseInt(sequence));
        }
        
        return maxSequence;
    }
    
    /**
     * Create message digest
     */
    createDigest(value) {
        const data = JSON.stringify(value);
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    /**
     * Sign message (simplified for demo)
     */
    signMessage(message) {
        const data = JSON.stringify(message);
        return crypto.createHash('sha256').update(data + this.nodeId).digest('hex');
    }
    
    /**
     * Verify message signature (simplified for demo)
     */
    verifySignature(message, senderId) {
        // In production, this would use actual cryptographic signatures
        // For now, we'll do a simple verification
        const { signature, ...messageWithoutSig } = message;
        const expectedSignature = crypto.createHash('sha256')
            .update(JSON.stringify(messageWithoutSig) + senderId)
            .digest('hex');
        
        return signature === expectedSignature;
    }
    
    /**
     * Initiate view change
     */
    async initiateViewChange() {
        const newView = this.view + 1;
        const viewChangeMessage = {
            type: 'VIEW_CHANGE',
            nodeId: this.nodeId,
            oldView: this.view,
            newView,
            timestamp: Date.now()
        };
        
        viewChangeMessage.signature = this.signMessage(viewChangeMessage);
        await this.broadcast('VIEW_CHANGE', viewChangeMessage);
        
        // Vote for ourselves
        await this.handleViewChange(viewChangeMessage, this.nodeId);
    }
    
    /**
     * Check node health and trigger view change if needed
     */
    async checkHealth() {
        if (this.phase !== 'IDLE' && Date.now() - this.lastActivity > this.timeout) {
            this.emit('timeout', { phase: this.phase });
            await this.initiateViewChange();
        }
    }
    
    /**
     * Get consensus state
     */
    getState() {
        return {
            nodeId: this.nodeId,
            view: this.view,
            isPrimary: this.isPrimary,
            phase: this.phase,
            sequenceNumber: this.sequenceNumber,
            consensusReached: this.consensusReached,
            nodes: Array.from(this.nodes.keys()),
            committedCount: this.committedMessages.size,
            messageLogSize: this.messageLog.length
        };
    }
}

export default ByzantineConsensus;