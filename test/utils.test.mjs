import { describe, it, expect } from 'vitest';
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
            expect(data.name).toBe('test-agent');
            expect(data.type).toBe('core');
            expect(remaining).toContain('# Agent content here');
        });

        it('should handle content without frontmatter', () => {
            const content = '# Just markdown content';
            const [data, remaining] = extractYamlFrontmatter(content);
            
            expect(data).toEqual({});
            expect(remaining).toBe(content);
        });

        it('should handle invalid YAML gracefully', () => {
            const content = `---
invalid: yaml: content:
---`;
            
            const [data, remaining] = extractYamlFrontmatter(content);
            expect(data).toEqual({});
        });
    });

    describe('serializeToFrontmatter', () => {
        it('should serialize data to YAML frontmatter format', () => {
            const data = { name: 'test-agent', type: 'core' };
            const content = '# Agent content';
            
            const result = serializeToFrontmatter(data, content);
            expect(result).toMatch(/^---\n/);
            expect(result).toContain('name: test-agent');
            expect(result).toContain('type: core');
            expect(result).toContain('# Agent content');
        });
    });

    describe('determineAgentType', () => {
        it('should use existing type if provided', () => {
            const type = determineAgentType('/any/path.md', { type: 'swarm' });
            expect(type).toBe('swarm');
        });

        it('should determine type from directory', () => {
            expect(determineAgentType('/agents/swarm/agent.md')).toBe('swarm');
            expect(determineAgentType('/agents/github/pr.md')).toBe('github');
        });

        it('should determine type from filename', () => {
            expect(determineAgentType('/agents/misc/swarm-coordinator.md')).toBe('swarm');
            expect(determineAgentType('/agents/misc/test-runner.md')).toBe('testing');
        });

        it('should default to core for unknown types', () => {
            expect(determineAgentType('/agents/misc/unknown.md')).toBe('core');
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
            expect(result.a).toBe(1);
            expect(result.b.c).toBe(4);
            expect(result.b.d).toBe(3);
            expect(result.b.f).toBe(5);
            expect(result.g).toBe(6);
            expect(result.e).toEqual([1, 2]);
        });
    });

    describe('formatFileSize', () => {
        it('should format file sizes correctly', () => {
            expect(formatFileSize(0)).toBe('0 Bytes');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1048576)).toBe('1 MB');
            expect(formatFileSize(1536)).toBe('1.5 KB');
        });
    });

    describe('convertToolsToObject', () => {
        it('should convert array tools to object format', () => {
            const tools = ['Read', 'Write', 'Bash', 'Task'];
            const result = convertToolsToObject(tools);
            
            expect(result.allowed).toEqual(['Read', 'Write', 'Bash']);
            expect(result.restricted).toEqual(['Task']);
            expect(result.conditional).toEqual([]);
        });

        it('should return object tools unchanged', () => {
            const tools = {
                allowed: ['Read'],
                restricted: ['Write'],
                conditional: []
            };
            
            const result = convertToolsToObject(tools);
            expect(result).toEqual(tools);
        });
    });
});