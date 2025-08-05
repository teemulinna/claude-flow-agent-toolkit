import { describe, it, expect } from 'vitest';
import { AgentConfig } from '../lib/config.mjs';

describe('AgentConfig', () => {
    describe('generateDefaults', () => {
        it('should generate valid default configuration', () => {
            const config = AgentConfig.generateDefaults('test-agent', 'core');
            
            expect(config.name).toBe('test-agent');
            expect(config.type).toBe('core');
            expect(config.color).toBe('#FF6B35');
            expect(config.version).toBe('1.0.0');
            expect(config.priority).toBe('medium');
            expect(Array.isArray(config.capabilities)).toBe(true);
            expect(config.triggers).toBeDefined();
            expect(config.tools).toBeDefined();
            expect(config.constraints).toBeDefined();
        });

        it('should apply custom options', () => {
            const config = AgentConfig.generateDefaults('test-agent', 'swarm', {
                description: 'Custom description',
                capabilities: ['cap1', 'cap2']
            });
            
            expect(config.description).toBe('Custom description');
            expect(config.capabilities).toEqual(['cap1', 'cap2']);
        });
    });

    describe('normalizeType', () => {
        it('should return valid types unchanged', () => {
            expect(AgentConfig.normalizeType('core')).toBe('core');
            expect(AgentConfig.normalizeType('swarm')).toBe('swarm');
        });

        it('should map legacy types', () => {
            expect(AgentConfig.normalizeType('developer')).toBe('core');
            expect(AgentConfig.normalizeType('coordinator')).toBe('swarm');
            expect(AgentConfig.normalizeType('analyst')).toBe('analysis');
        });

        it('should default unknown types to core', () => {
            expect(AgentConfig.normalizeType('unknown-type')).toBe('core');
        });
    });

    describe('validateDirectoryPlacement', () => {
        it('should allow any type in functional directories', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/templates/swarm-init.md',
                'swarm'
            );
            expect(result.valid).toBe(true);
        });

        it('should allow any type in all directories (no strict enforcement)', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/core/swarm-agent.md',
                'swarm'
            );
            expect(result.valid).toBe(true);
        });

        it('should allow correct type in strict directories', () => {
            const result = AgentConfig.validateDirectoryPlacement(
                '/agents/core/base-agent.md',
                'core'
            );
            expect(result.valid).toBe(true);
        });
    });

    describe('getTemplate', () => {
        it('should return a complete template', () => {
            const template = AgentConfig.getTemplate();
            
            // Check all required fields are present
            AgentConfig.REQUIRED_FIELDS.forEach(field => {
                expect(field in template).toBe(true);
            });
            
            expect(template.name).toBe('agent-name');
            expect(template.type).toBe('core');
        });
    });
});