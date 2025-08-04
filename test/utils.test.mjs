import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    extractYamlFrontmatter,
    serializeToFrontmatter,
    determineAgentType,
    deepMerge,
    formatFileSize,
    convertToolsToObject
} from '../lib/utils.mjs';

describe('Utils', () => {
    describe('extractYamlFrontmatter', () => {
        it('should extract valid YAML frontmatter', () => {
            const content = `---
name: test-agent
type: core
---

# Agent content here`;
            
            const [data, remaining] = extractYamlFrontmatter(content);
            assert.strictEqual(data.name, 'test-agent');
            assert.strictEqual(data.type, 'core');
            assert.ok(remaining.includes('# Agent content here'));
        });

        it('should handle content without frontmatter', () => {
            const content = '# Just markdown content';
            const [data, remaining] = extractYamlFrontmatter(content);
            
            assert.deepStrictEqual(data, {});
            assert.strictEqual(remaining, content);
        });

        it('should handle invalid YAML gracefully', () => {
            const content = `---
invalid: yaml: content:
---`;
            
            const [data, remaining] = extractYamlFrontmatter(content);
            assert.deepStrictEqual(data, {});
        });
    });

    describe('serializeToFrontmatter', () => {
        it('should serialize data to YAML frontmatter format', () => {
            const data = { name: 'test-agent', type: 'core' };
            const content = '# Agent content';
            
            const result = serializeToFrontmatter(data, content);
            assert.ok(result.startsWith('---\n'));
            assert.ok(result.includes('name: test-agent'));
            assert.ok(result.includes('type: core'));
            assert.ok(result.includes('# Agent content'));
        });
    });

    describe('determineAgentType', () => {
        it('should use existing type if provided', () => {
            const type = determineAgentType('/any/path.md', { type: 'swarm' });
            assert.strictEqual(type, 'swarm');
        });

        it('should determine type from directory', () => {
            assert.strictEqual(determineAgentType('/agents/swarm/agent.md'), 'swarm');
            assert.strictEqual(determineAgentType('/agents/github/pr.md'), 'github');
        });

        it('should determine type from filename', () => {
            assert.strictEqual(determineAgentType('/agents/misc/swarm-coordinator.md'), 'swarm');
            assert.strictEqual(determineAgentType('/agents/misc/test-runner.md'), 'testing');
        });

        it('should default to core for unknown types', () => {
            assert.strictEqual(determineAgentType('/agents/misc/unknown.md'), 'core');
        });
    });

    describe('deepMerge', () => {
        it('should merge objects deeply', () => {
            const target = {
                a: 1,
                b: { c: 2, d: 3 },
                e: [1, 2]
            };
            const source = {
                b: { c: 4, f: 5 },
                g: 6
            };
            
            const result = deepMerge(target, source);
            assert.strictEqual(result.a, 1);
            assert.strictEqual(result.b.c, 4);
            assert.strictEqual(result.b.d, 3);
            assert.strictEqual(result.b.f, 5);
            assert.strictEqual(result.g, 6);
            assert.deepStrictEqual(result.e, [1, 2]);
        });
    });

    describe('formatFileSize', () => {
        it('should format file sizes correctly', () => {
            assert.strictEqual(formatFileSize(0), '0 Bytes');
            assert.strictEqual(formatFileSize(1024), '1 KB');
            assert.strictEqual(formatFileSize(1048576), '1 MB');
            assert.strictEqual(formatFileSize(1536), '1.5 KB');
        });
    });

    describe('convertToolsToObject', () => {
        it('should convert array tools to object format', () => {
            const tools = ['Read', 'Write', 'Bash', 'Task'];
            const result = convertToolsToObject(tools);
            
            assert.deepStrictEqual(result.allowed, ['Read', 'Write', 'Bash']);
            assert.deepStrictEqual(result.restricted, ['Task']);
            assert.deepStrictEqual(result.conditional, []);
        });

        it('should return object tools unchanged', () => {
            const tools = {
                allowed: ['Read'],
                restricted: ['Write'],
                conditional: []
            };
            
            const result = convertToolsToObject(tools);
            assert.deepStrictEqual(result, tools);
        });
    });
});