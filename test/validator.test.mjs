import { describe, it } from 'node:test';
import assert from 'node:assert';
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
            assert.strictEqual(errors.length, 0);
        });

        it('should detect missing required fields', () => {
            const validator = new AgentValidator();
            const incompleteConfig = {
                name: 'test-agent',
                type: 'core'
                // Missing other required fields
            };
            
            const errors = validator.validateConfig(incompleteConfig);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('Missing required field')));
        });

        it('should validate agent name format', () => {
            const validator = new AgentValidator();
            const invalidNameConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                name: 'Invalid Name!' // Not kebab-case
            };
            
            const errors = validator.validateConfig(invalidNameConfig);
            assert.ok(errors.some(e => e.includes('must be kebab-case')));
        });

        it('should validate agent type', () => {
            const validator = new AgentValidator();
            const invalidTypeConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                type: 'invalid-type'
            };
            
            const errors = validator.validateConfig(invalidTypeConfig);
            assert.ok(errors.some(e => e.includes('Invalid type')));
        });

        it('should validate color format', () => {
            const validator = new AgentValidator();
            const invalidColorConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                color: 'red' // Not hex format
            };
            
            const errors = validator.validateConfig(invalidColorConfig);
            assert.ok(errors.some(e => e.includes('must be a valid hex color')));
        });

        it('should validate tools structure', () => {
            const validator = new AgentValidator();
            const invalidToolsConfig = {
                ...AgentConfig.generateDefaults('test-agent', 'core'),
                tools: ['Read', 'Write'] // Should be object, not array
            };
            
            const errors = validator.validateConfig(invalidToolsConfig);
            assert.ok(errors.some(e => e.includes('tools') && e.includes('must be an object')));
        });
    });

    describe('validateDirectory', () => {
        it('should allow agents in functional directories', () => {
            const validator = new AgentValidator();
            const filePath = '/test/agents/templates/swarm-init.md';
            const agentData = { type: 'swarm' };
            
            const errors = validator.validateDirectory(filePath, agentData);
            assert.strictEqual(errors.length, 0);
        });

        it('should enforce type matching in strict directories', () => {
            const validator = new AgentValidator();
            const filePath = '/test/agents/core/swarm-agent.md';
            const agentData = { type: 'swarm' };
            
            const errors = validator.validateDirectory(filePath, agentData);
            assert.ok(errors.length > 0);
            assert.ok(errors[0].includes('should have type \'core\''));
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
            assert.ok(warnings.some(w => w.includes('No capabilities defined')));
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
            assert.ok(warnings.some(w => w.includes('No trigger patterns defined')));
        });
    });
});