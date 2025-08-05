import { describe, it, expect } from 'vitest';
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
            expect(fixed.color).toBeDefined();
            expect(fixed.description).toBeDefined();
            expect(fixed.version).toBeDefined();
            expect(fixed.priority).toBeDefined();
            expect(fixed.capabilities).toBeDefined();
            expect(fixed.tools).toBeDefined();
            expect(fixed.version).toBe('1.0.0');
            expect(fixed.priority).toBe('medium');
        });

        it('should convert array tools to object format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                tools: ['Read', 'Write', 'Bash', 'Task']
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            expect(typeof fixed.tools).toBe('object');
            expect(fixed.tools.allowed).toEqual(['Read', 'Write', 'Bash']);
            expect(fixed.tools.restricted).toEqual(['Task']);
            expect(fixed.tools.conditional).toEqual([]);
        });

        it('should fix invalid priority values', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                priority: 'ultra-high' // Invalid
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            expect(fixed.priority).toBe('medium');
        });

        it('should fix invalid color format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                color: 'red' // Invalid format
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            expect(fixed.color).toMatch(/^#[0-9A-F]{6}$/i);
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
            expect(Array.isArray(fixed.tools.restricted)).toBe(true);
            expect(Array.isArray(fixed.tools.conditional)).toBe(true);
        });

        it('should normalize agent type based on directory', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'developer' // Legacy type
            };
            
            const fixed = fixer.fixAgent('/agents/core/test.md', agent);
            expect(fixed.type).toBe('core');
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
            expect(fixedSwarm.capabilities).toContain('coordination');
            
            // GitHub agent
            const githubAgent = {
                name: 'github-agent',
                type: 'github',
                capabilities: []
            };
            const fixedGithub = fixer.fixAgent('/test/github.md', githubAgent);
            expect(fixedGithub.capabilities).toContain('repository_management');
        });

        it('should fix invalid version format', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core',
                version: 'v1.0' // Invalid
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            expect(fixed.version).toBe('1.0.0');
        });

        it('should add missing nested structures', () => {
            const fixer = new AgentFixer();
            const agent = {
                name: 'test-agent',
                type: 'core'
            };
            
            const fixed = fixer.fixAgent('/test/agent.md', agent);
            
            // Check nested structures exist
            expect(fixed.triggers).toBeDefined();
            expect(Array.isArray(fixed.triggers.keywords)).toBe(true);
            expect(Array.isArray(fixed.triggers.patterns)).toBe(true);
            
            expect(fixed.constraints).toBeDefined();
            expect(typeof fixed.constraints.max_file_operations).toBe('number');
            
            expect(fixed.communication).toBeDefined();
            expect(Array.isArray(fixed.communication.can_spawn)).toBe(true);
            
            expect(fixed.dependencies).toBeDefined();
            expect(Array.isArray(fixed.dependencies.requires)).toBe(true);
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
            
            expect(fixed.color).toBe('#123456');
            expect(fixed.description).toBe('Custom description');
            expect(fixed.capabilities).toContain('custom-capability');
            expect(fixed.customField).toBe('should-be-preserved');
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
            
            // Check backup was created (as .backup file)
            const backupPath = path.join(agentsDir, 'test-agent.md.backup');
            await expect(fs.access(backupPath)).resolves.toBeUndefined();
            
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
            
            // Check no backup file was created
            const backupPath = path.join(agentsDir, 'test-agent.md.backup');
            try {
                await fs.access(backupPath);
                expect.fail('Backup file should not exist');
            } catch (err) {
                expect(err.code).toBe('ENOENT');
            }
            
            await cleanupTestDir();
        });
    });
});