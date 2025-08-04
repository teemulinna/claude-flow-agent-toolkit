import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AgentFixer } from '../lib/fixer.mjs';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('AgentFixer', () => {
    describe('fixAgent', () => {
        it('should add missing required fields', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core'
                // Missing other required fields
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            // Should add all missing required fields
            assert.ok(fixed.color);
            assert.ok(fixed.description);
            assert.ok(fixed.version);
            assert.ok(fixed.priority);
            assert.ok(fixed.capabilities);
            assert.ok(fixed.tools);
            assert.strictEqual(fixed.version, '1.0.0');
            assert.strictEqual(fixed.priority, 'medium');
        });

        it('should convert array tools to object format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                tools: ['Read', 'Write', 'Bash', 'Task']
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            assert.strictEqual(typeof fixed.tools, 'object');
            assert.deepStrictEqual(fixed.tools.allowed, ['Read', 'Write', 'Bash']);
            assert.deepStrictEqual(fixed.tools.restricted, ['Task']);
            assert.deepStrictEqual(fixed.tools.conditional, []);
        });

        it('should fix invalid priority values', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                priority: 'ultra-high' // Invalid
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            assert.strictEqual(fixed.priority, 'medium');
        });

        it('should fix invalid color format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                color: 'red' // Invalid format
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            assert.ok(fixed.color.match(/^#[0-9A-F]{6}$/i));
        });

        it('should add missing tool categories', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                tools: {
                    allowed: ['Read', 'Write']
                    // Missing restricted and conditional
                }
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            assert.ok(Array.isArray(fixed.tools.restricted));
            assert.ok(Array.isArray(fixed.tools.conditional));
        });

        it('should normalize agent type based on directory', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'developer' // Legacy type
            };
            
            const fixed = fixer.fixAgent('/agents/core/test.md', agent);
            assert.strictEqual(fixed.type, 'core');
        });

        it('should add default capabilities based on type', () => {
            const fixer = new AgentFixer();
            
            // Swarm agent
            const swarmAgent = {
                name: 'swarm-agent',
                type: 'swarm',
                capabilities: []
            };
            const fixedSwarm = fixer.fixAgent('/test/swarm.md', swarmAgent);
            assert.ok(fixedSwarm.capabilities.includes('coordination'));
            
            // GitHub agent
            const githubAgent = {
                name: 'github-agent',
                type: 'github',
                capabilities: []
            };
            const fixedGithub = fixer.fixAgent('/test/github.md', githubAgent);
            assert.ok(fixedGithub.capabilities.includes('repository_management'));
        });

        it('should fix invalid version format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                version: 'v1.0' // Invalid
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            assert.strictEqual(fixed.version, '1.0.0');
        });

        it('should add missing nested structures', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core'
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            // Check nested structures exist
            assert.ok(fixed.triggers);
            assert.ok(Array.isArray(fixed.triggers.keywords));
            assert.ok(Array.isArray(fixed.triggers.patterns));
            
            assert.ok(fixed.constraints);
            assert.ok(typeof fixed.constraints.max_file_operations === 'number');
            
            assert.ok(fixed.communication);
            assert.ok(Array.isArray(fixed.communication.can_spawn));
            
            assert.ok(fixed.dependencies);
            assert.ok(Array.isArray(fixed.dependencies.requires));
        });

        it('should preserve existing valid data', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                color: '#123456',
                description: 'Custom description',
                capabilities: ['custom-capability'],
                customField: 'should-be-preserved'
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            assert.strictEqual(fixed.color, '#123456');
            assert.strictEqual(fixed.description, 'Custom description');
            assert.ok(fixed.capabilities.includes('custom-capability'));
            assert.strictEqual(fixed.customField, 'should-be-preserved');
        });
    });

    describe('backup functionality', () => {
        const testDir = path.join(__dirname, 'fixtures', 'backup-test');
        const agentsDir = path.join(testDir, '.claude', 'agents');
        const testAgent = path.join(agentsDir, 'test-agent.md');
        
        // Helper to create test directory structure
        async function setupTestDir() {
            await fs.mkdir(agentsDir, { recursive: true });
            await fs.writeFile(testAgent, `---
name: test-agent
type: core
---

# Test Agent`);
        }
        
        // Helper to clean up test directory
        async function cleanupTestDir() {
            try {
                await fs.rm(testDir, { recursive: true, force: true });
            } catch (err) {
                // Ignore cleanup errors
            }
        }
        
        it('should create backup when enabled', async function() {
            await setupTestDir();
            
            const fixer = new AgentFixer({ 
                agentsDir,
                backup: true 
            });
            
            // Fix a single agent to trigger backup
            await fixer.fixSingle('test-agent.md');
            
            // Check backup was created
            const backups = await fs.readdir(path.join(agentsDir, '.backup'));
            assert.ok(backups.length > 0);
            assert.ok(backups[0].includes('test-agent.md'));
            
            await cleanupTestDir();
        });
        
        it('should not create backup when disabled', async function() {
            await setupTestDir();
            
            const fixer = new AgentFixer({ 
                agentsDir,
                backup: false 
            });
            
            // Fix a single agent
            await fixer.fixSingle('test-agent.md');
            
            // Check no backup directory was created
            try {
                await fs.access(path.join(agentsDir, '.backup'));
                assert.fail('Backup directory should not exist');
            } catch (err) {
                assert.strictEqual(err.code, 'ENOENT');
            }
            
            await cleanupTestDir();
        });
    });
});