import { describe, it, expect } from 'vitest';
import { AgentValidator } from '../lib/validator.mjs';
import { AgentConfig } from '../lib/config.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AgentValidator', () => {
    describe('validateConfig', () => {
        it('should validate a complete agent configuration', () => {
            const validator = new AgentValidator();
            const validConfig = AgentConfig.generateDefaults('test-agent', 'core');
            
            const errors = validator.validateConfig(validConfig);
            expect(errors.length).toBe(0);
        });

        it('should detect missing required fields', () => {
            const validator = new AgentValidator();
            const incompleteConfig = {
                name: 'test-agent',
                type: 'core'
                // Missing other required fields
            };
            
            const errors = validator.validateConfig(incompleteConfig);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('Missing required field'))).toBe(true);
        });

        it('should validate agent name format', () => {
            const validator = new AgentValidator();
            const invalidNameConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                name: 'Invalid Name!' // Not kebab-case
            };
            
            const errors = validator.validateConfig(invalidNameConfig);
            expect(errors.some(e => e.includes('must be kebab-case'))).toBe(true);
        });

        it('should validate agent type', () => {
            const validator = new AgentValidator();
            const invalidTypeConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                type: 'invalid-type'
            };
            
            const errors = validator.validateConfig(invalidTypeConfig);
            expect(errors.some(e => e.includes('Invalid type'))).toBe(true);
        });

        it('should validate color format', () => {
            const validator = new AgentValidator();
            const invalidColorConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                color: 'red' // Not hex format
            };
            
            const errors = validator.validateConfig(invalidColorConfig);
            expect(errors.some(e => e.includes('must be a valid hex color'))).toBe(true);
        });

        it('should validate tools structure', () => {
            const validator = new AgentValidator();
            const invalidToolsConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                tools: ['Read', 'Write'] // Should be object, not array
            };
            
            const errors = validator.validateConfig(invalidToolsConfig);
            expect(errors.some(e => e.includes('tools') && e.includes('must be an object'))).toBe(true);
        });
    });

    describe('validateDirectory', () => {
        it('should allow agents in functional directories', () => {
            const validator = new AgentValidator();
            const filePath = '/test/agents/templates/swarm-init.md';
            const agentData = { type: 'swarm' };
            
            const errors = validator.validateDirectory(filePath, agentData);
            expect(errors.length).toBe(0);
        });

        it('should allow any type in all directories (no strict enforcement)', () => {
            const validator = new AgentValidator();
            const filePath = '/test/agents/core/swarm-agent.md';
            const agentData = { type: 'swarm' };
            
            const errors = validator.validateDirectory(filePath, agentData);
            expect(errors.length).toBe(0);
        });
    });

    describe('checkWarnings', () => {
        it('should warn about empty capabilities', () => {
            const validator = new AgentValidator();
            const config = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                capabilities: []
            };
            
            const warnings = validator.checkWarnings(config);
            expect(warnings.some(w => w.includes('No capabilities defined'))).toBe(true);
        });

        it('should warn about missing triggers', () => {
            const validator = new AgentValidator();
            const config = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                triggers: {
                    keywords: [],
                    patterns: [],
                    file_patterns: [],
                    context_patterns: []
                }
            };
            
            const warnings = validator.checkWarnings(config);
            expect(warnings.some(w => w.includes('No trigger patterns defined'))).toBe(true);
        });
    });
});