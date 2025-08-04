import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { analyzer } from '../lib/analyzer.mjs';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Analyzer', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `analyzer-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('analyze', () => {
    it('should analyze a system with valid agents', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      // Create test agents
      const testAgent = {
        name: 'test-agent',
        version: '1.0.0',
        description: 'Test agent',
        capabilities: ['test'],
        tools: ['Read', 'Write'],
        prompts: {
          main: 'You are a test agent'
        }
      };

      await writeFile(
        join(agentsDir, 'test-agent.json'),
        JSON.stringify(testAgent, null, 2)
      );

      const result = await analyzer.analyze(tempDir);

      expect(result).toMatchObject({
        summary: {
          totalAgents: 1,
          validAgents: 1,
          invalidAgents: 0,
          totalCapabilities: 1,
          uniqueCapabilities: 1,
          totalTools: 2,
          uniqueTools: 2
        },
        agents: [expect.objectContaining({
          name: 'test-agent',
          version: '1.0.0',
          valid: true
        })],
        capabilities: {
          test: 1
        },
        tools: {
          Read: 1,
          Write: 1
        }
      });
    });

    it('should identify invalid agents', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      // Create invalid agent (missing required fields)
      const invalidAgent = {
        name: 'invalid-agent',
        // missing version and other required fields
      };

      await writeFile(
        join(agentsDir, 'invalid-agent.json'),
        JSON.stringify(invalidAgent, null, 2)
      );

      const result = await analyzer.analyze(tempDir);

      expect(result.summary.invalidAgents).toBe(1);
      expect(result.agents[0].valid).toBe(false);
      expect(result.agents[0].errors).toBeDefined();
    });

    it('should calculate capability distribution', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      // Create multiple agents with overlapping capabilities
      const agents = [
        {
          name: 'agent-1',
          version: '1.0.0',
          description: 'Agent 1',
          capabilities: ['code', 'review'],
          tools: ['Read'],
          prompts: { main: 'Agent 1' }
        },
        {
          name: 'agent-2',
          version: '1.0.0',
          description: 'Agent 2',
          capabilities: ['code', 'test'],
          tools: ['Write'],
          prompts: { main: 'Agent 2' }
        }
      ];

      for (const agent of agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = await analyzer.analyze(tempDir);

      expect(result.capabilities).toEqual({
        code: 2,
        review: 1,
        test: 1
      });
    });

    it('should track tool usage', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = [
        {
          name: 'agent-1',
          version: '1.0.0',
          description: 'Agent 1',
          capabilities: ['code'],
          tools: ['Read', 'Write', 'Task'],
          prompts: { main: 'Agent 1' }
        },
        {
          name: 'agent-2',
          version: '1.0.0',
          description: 'Agent 2',
          capabilities: ['test'],
          tools: ['Read', 'Bash'],
          prompts: { main: 'Agent 2' }
        }
      ];

      for (const agent of agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = await analyzer.analyze(tempDir);

      expect(result.tools).toEqual({
        Read: 2,
        Write: 1,
        Task: 1,
        Bash: 1
      });
    });

    it('should identify duplicate agents', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = {
        name: 'duplicate-agent',
        version: '1.0.0',
        description: 'Duplicate agent',
        capabilities: ['test'],
        tools: ['Read'],
        prompts: { main: 'Test' }
      };

      // Create same agent in different locations
      await writeFile(
        join(agentsDir, 'duplicate-agent.json'),
        JSON.stringify(agent, null, 2)
      );

      await mkdir(join(agentsDir, 'subdir'), { recursive: true });
      await writeFile(
        join(agentsDir, 'subdir', 'duplicate-agent.json'),
        JSON.stringify(agent, null, 2)
      );

      const result = await analyzer.analyze(tempDir);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Duplicate agent name')
        })
      );
    });

    it('should generate visualization data', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = [
        {
          name: 'coordinator',
          version: '1.0.0',
          description: 'Coordinator',
          capabilities: ['coordinate'],
          tools: ['Task'],
          dependencies: ['worker-1', 'worker-2'],
          prompts: { main: 'Coordinator' }
        },
        {
          name: 'worker-1',
          version: '1.0.0',
          description: 'Worker 1',
          capabilities: ['work'],
          tools: ['Read', 'Write'],
          prompts: { main: 'Worker 1' }
        },
        {
          name: 'worker-2',
          version: '1.0.0',
          description: 'Worker 2',
          capabilities: ['work'],
          tools: ['Bash'],
          prompts: { main: 'Worker 2' }
        }
      ];

      for (const agent of agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = await analyzer.analyze(tempDir);

      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.coordinator).toEqual(['worker-1', 'worker-2']);
    });

    it('should handle empty agents directory', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const result = await analyzer.analyze(tempDir);

      expect(result.summary.totalAgents).toBe(0);
      expect(result.agents).toEqual([]);
    });

    it('should handle missing agents directory', async () => {
      const result = await analyzer.analyze(tempDir);

      expect(result.summary.totalAgents).toBe(0);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'info',
          message: expect.stringContaining('No agents directory found')
        })
      );
    });

    it('should detect circular dependencies', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = [
        {
          name: 'agent-a',
          version: '1.0.0',
          description: 'Agent A',
          capabilities: ['a'],
          tools: ['Task'],
          dependencies: ['agent-b'],
          prompts: { main: 'Agent A' }
        },
        {
          name: 'agent-b',
          version: '1.0.0',
          description: 'Agent B',
          capabilities: ['b'],
          tools: ['Task'],
          dependencies: ['agent-a'],
          prompts: { main: 'Agent B' }
        }
      ];

      for (const agent of agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = await analyzer.analyze(tempDir);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Circular dependency detected')
        })
      );
    });

    it('should analyze agent complexity', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const complexAgent = {
        name: 'complex-agent',
        version: '1.0.0',
        description: 'Complex agent',
        capabilities: ['code', 'test', 'review', 'deploy', 'monitor'],
        tools: ['Read', 'Write', 'Task', 'Bash', 'WebSearch', 'TodoWrite'],
        prompts: {
          main: 'Main prompt',
          error: 'Error prompt',
          success: 'Success prompt'
        },
        dependencies: ['dep-1', 'dep-2', 'dep-3']
      };

      await writeFile(
        join(agentsDir, 'complex-agent.json'),
        JSON.stringify(complexAgent, null, 2)
      );

      const result = await analyzer.analyze(tempDir);

      const agent = result.agents.find(a => a.name === 'complex-agent');
      expect(agent.complexity).toBeDefined();
      expect(agent.complexity).toBeGreaterThan(5); // High complexity score
    });
  });

  describe('generateReport', () => {
    it('should generate a text report', async () => {
      const analysis = {
        summary: {
          totalAgents: 2,
          validAgents: 2,
          invalidAgents: 0,
          totalCapabilities: 3,
          uniqueCapabilities: 2,
          totalTools: 4,
          uniqueTools: 3
        },
        agents: [
          { name: 'agent-1', valid: true },
          { name: 'agent-2', valid: true }
        ],
        capabilities: { code: 2, test: 1 },
        tools: { Read: 2, Write: 1, Task: 1 }
      };

      const report = analyzer.generateReport(analysis);

      expect(report).toContain('Claude Flow Agent System Analysis');
      expect(report).toContain('Total Agents: 2');
      expect(report).toContain('Valid Agents: 2');
      expect(report).toContain('Capability Distribution');
      expect(report).toContain('Tool Usage');
    });

    it('should generate a JSON report', async () => {
      const analysis = {
        summary: { totalAgents: 1 },
        agents: [],
        capabilities: {},
        tools: {}
      };

      const report = analyzer.generateReport(analysis, 'json');
      const parsed = JSON.parse(report);

      expect(parsed).toEqual(analysis);
    });

    it('should generate a markdown report', async () => {
      const analysis = {
        summary: {
          totalAgents: 1,
          validAgents: 1,
          invalidAgents: 0
        },
        agents: [{ name: 'test', valid: true }],
        capabilities: { test: 1 },
        tools: { Read: 1 },
        issues: [
          { type: 'warning', message: 'Test warning' }
        ]
      };

      const report = analyzer.generateReport(analysis, 'markdown');

      expect(report).toContain('# Claude Flow Agent System Analysis');
      expect(report).toContain('## Summary');
      expect(report).toContain('| Metric | Value |');
      expect(report).toContain('## Issues');
      expect(report).toContain('⚠️ Test warning');
    });
  });
});