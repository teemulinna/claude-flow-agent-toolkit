import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AgentConfig } from '../lib/config.mjs';

describe('AgentConfig', () => {
    describe('generateDefaults', () => {
        it('should generate valid default configuration', () => {
            const config = AgentConfig.generateDefaults('test-agent', 'core');
            
            assert.strictEqual(config.name, 'test-agent');
            assert.strictEqual(config.type, 'core');
            assert.strictEqual(config.color, '#FF6B35');
            assert.strictEqual(config.version, '1.0.0');
            assert.strictEqual(config.priority, 'medium');
            assert.ok(Array.isArray(config.capabilities));
            assert.ok(config.triggers);
            assert.ok(config.tools);
            assert.ok(config.constraints);
        });

        it('should apply custom options', () => {
            const config = AgentConfig.generateDefaults('test-agent', 'swarm', {
                description: 'Custom description',
                capabilities: ['cap1', 'cap2']
            });
            
            assert.strictEqual(config.description, 'Custom description');
            assert.deepStrictEqual(config.capabilities, ['cap1', 'cap2']);
        });
    });

    describe('normalizeType', () => {
        it('should return valid types unchanged', () => {
            assert.strictEqual(AgentConfig.normalizeType('core'), 'core');
            assert.strictEqual(AgentConfig.normalizeType('swarm'), 'swarm');
        });

        it('should map legacy types', () => {
            assert.strictEqual(AgentConfig.normalizeType('developer'), 'core');
            assert.strictEqual(AgentConfig.normalizeType('coordinator'), 'swarm');
            assert.strictEqual(AgentConfig.normalizeType('analyst'), 'analysis');
        });

        it('should default unknown types to core', () => {
            assert.strictEqual(AgentConfig.normalizeType('unknown-type'), 'core');
        });
    });

    describe('validateDirectoryPlacement', () => {
        it('should allow any type in functional directories', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/templates/swarm-init.md',
                'swarm'
            );
            assert.strictEqual(result.valid, true);
        });

        it('should enforce type matching in strict directories', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/core/swarm-agent.md',
                'swarm'
            );
            assert.strictEqual(result.valid, false);
            assert.ok(result.error.includes('should have type \'core\''));
        });

        it('should allow correct type in strict directories', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/core/base-agent.md',
                'core'
            );
            assert.strictEqual(result.valid, true);
        });
    });

    describe('getTemplate', () => {
        it('should return a complete template', () => {
            const template = AgentConfig.getTemplate();
            
            // Check all required fields are present
            AgentConfig.REQUIRED_FIELDS.forEach(field => {
                assert.ok(field in template, `Missing required field: ${field}`);
            });
            
            assert.strictEqual(template.name, 'agent-name');
            assert.strictEqual(template.type, 'core');
        });
    });
});