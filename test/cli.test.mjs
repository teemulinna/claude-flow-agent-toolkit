import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, '..', 'bin', 'cli.mjs');

// Helper to create a valid agent configuration
const createValidAgent = (overrides = {}) => ({
  name: 'test-agent',
  type: 'core',
  color: '#FF6B35',
  version: '1.0.0',
  description: 'Test agent',
  priority: 'medium',
  capabilities: ['test'],
  triggers: { keywords: ['test'] },
  tools: { allowed: ['Read'], restricted: ['Task'], conditional: [] },
  constraints: { max_file_operations: 100 },
  communication: { can_spawn: [] },
  dependencies: { requires: [] },
  resources: { memory_limit: '512MB' },
  execution: { parallelization: { enabled: true } },
  security: { sandboxing: { enabled: true } },
  monitoring: { enabled: true },
  hooks: {},
  prompts: { main: 'Test agent' },
  ...overrides
});

describe('CLI', () => {
  let tempDir;
  
  beforeEach(async () => {
    tempDir = join(tmpdir(), `cli-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const runCLI = (args, cwd = tempDir) => {
    try {
      const output = execSync(`node ${cliPath} ${args}`, {
        cwd,
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' }
      });
      return { success: true, output };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || '', 
        error: error.stderr || error.message 
      };
    }
  };

  describe('help command', () => {
    it('should display help when no arguments provided', () => {
      const result = runCLI('');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Claude Flow Agent Toolkit');
      expect(result.output).toContain('Commands:');
      expect(result.output).toContain('validate');
      expect(result.output).toContain('fix');
      expect(result.output).toContain('analyze');
      expect(result.output).toContain('create');
    });

    it('should display help with --help flag', () => {
      const result = runCLI('--help');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Claude Flow Agent Toolkit');
    });

    it('should display version with --version flag', () => {
      const result = runCLI('--version');
      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('validate command', () => {
    it('should validate a valid agent', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const validAgent = createValidAgent();

      await writeFile(
        join(agentsDir, 'test-agent.json'),
        JSON.stringify(validAgent, null, 2)
      );

      const result = runCLI('validate');
      expect(result.success).toBe(true);
      expect(result.output).toContain('✓');
      expect(result.output).toContain('test-agent');
      expect(result.output).toContain('All agents are valid');
    });

    it('should report invalid agent', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const invalidAgent = {
        name: 'invalid-agent',
        // Missing required fields
      };

      await writeFile(
        join(agentsDir, 'invalid-agent.json'),
        JSON.stringify(invalidAgent, null, 2)
      );

      const result = runCLI('validate');
      expect(result.success).toBe(false);
      expect(result.output).toContain('✗');
      expect(result.output).toContain('invalid-agent');
      expect(result.output).toContain('validation errors found');
    });

    it('should validate specific agent', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = createValidAgent({ name: 'specific-agent', description: 'Specific agent' });

      await writeFile(
        join(agentsDir, 'specific-agent.json'),
        JSON.stringify(agent, null, 2)
      );

      const result = runCLI('validate specific-agent');
      expect(result.success).toBe(true);
      expect(result.output).toContain('specific-agent');
    });

    it('should output JSON format', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = createValidAgent({ name: 'json-test', description: 'JSON test' });

      await writeFile(
        join(agentsDir, 'json-test.json'),
        JSON.stringify(agent, null, 2)
      );

      const result = runCLI('validate --format json');
      expect(result.success).toBe(true);
      
      const output = JSON.parse(result.output);
      expect(output).toHaveProperty('valid');
      expect(output).toHaveProperty('results');
    });
  });

  describe('fix command', () => {
    it('should fix agent issues', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const brokenAgent = {
        name: 'broken-agent',
        // Missing required fields
        capabilities: ['test']
      };

      const agentPath = join(agentsDir, 'broken-agent.json');
      await writeFile(agentPath, JSON.stringify(brokenAgent, null, 2));

      const result = runCLI('fix');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Fixed');

      // Verify the agent was fixed
      const fixed = JSON.parse(await readFile(agentPath, 'utf-8'));
      expect(fixed.version).toBe('1.0.0');
      expect(fixed.description).toBeDefined();
      expect(fixed.tools).toBeDefined();
      expect(fixed.prompts).toBeDefined();
    });

    it('should fix specific agent', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = {
        name: 'fixable-agent',
        version: '1.0.0'
        // Missing other required fields
      };

      await writeFile(
        join(agentsDir, 'fixable-agent.json'),
        JSON.stringify(agent, null, 2)
      );

      const result = runCLI('fix fixable-agent');
      expect(result.success).toBe(true);
      expect(result.output).toContain('fixable-agent');
    });

    it('should handle dry-run mode', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = {
        name: 'dry-run-agent',
        // Missing fields
      };

      const agentPath = join(agentsDir, 'dry-run-agent.json');
      await writeFile(agentPath, JSON.stringify(agent, null, 2));

      const result = runCLI('fix --dry-run');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Would fix');

      // Verify the agent was NOT modified
      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      expect(content.version).toBeUndefined();
    });
  });

  describe('analyze command', () => {
    it('should analyze agent system', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = [
        createValidAgent({
          name: 'agent-1',
          description: 'Agent 1',
          capabilities: ['code', 'review'],
          tools: { allowed: ['Read', 'Write'], restricted: ['Task'], conditional: [] }
        }),
        createValidAgent({
          name: 'agent-2',
          description: 'Agent 2',
          capabilities: ['test'],
          tools: { allowed: ['Bash'], restricted: ['Task'], conditional: [] }
        })
      ];

      for (const agent of agents) {
        await writeFile(
          join(agentsDir, `${agent.name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = runCLI('analyze');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Claude Flow Agent System Analysis');
      expect(result.output).toContain('Total Agents: 2');
      expect(result.output).toContain('Capability Distribution');
      expect(result.output).toContain('Tool Usage');
    });

    it('should output analysis in JSON format', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = createValidAgent({ name: 'analyze-json' });

      await writeFile(
        join(agentsDir, 'analyze-json.json'),
        JSON.stringify(agent, null, 2)
      );

      const result = runCLI('analyze --format json');
      expect(result.success).toBe(true);
      
      const analysis = JSON.parse(result.output);
      expect(analysis).toHaveProperty('summary');
      expect(analysis).toHaveProperty('agents');
      expect(analysis).toHaveProperty('capabilities');
      expect(analysis).toHaveProperty('tools');
    });

    it('should save analysis to file', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agent = createValidAgent({ name: 'save-analysis' });

      await writeFile(
        join(agentsDir, 'save-analysis.json'),
        JSON.stringify(agent, null, 2)
      );

      const outputPath = join(tempDir, 'analysis.json');
      const result = runCLI(`analyze --format json --output ${outputPath}`);
      expect(result.success).toBe(true);

      const savedAnalysis = JSON.parse(await readFile(outputPath, 'utf-8'));
      expect(savedAnalysis).toHaveProperty('summary');
    });
  });

  describe('create command', () => {
    it('should create agent from template', () => {
      const result = runCLI('create test-create-agent --template basic');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created agent');
      expect(result.output).toContain('test-create-agent');
    });

    it('should list templates', () => {
      const result = runCLI('create --list-templates');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Available templates:');
      expect(result.output).toContain('basic');
      expect(result.output).toContain('reviewer');
      expect(result.output).toContain('orchestrator');
    });

    it('should create agent with custom capabilities', () => {
      const result = runCLI('create custom-cap-agent --template basic --capabilities code,review,test');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created agent');
    });

    it('should create agent with custom tools', () => {
      const result = runCLI('create custom-tools-agent --template basic --tools Read,Write,Task,Bash');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created agent');
    });

    it('should create agent from prompt', () => {
      const result = runCLI('create security-scanner --prompt "Create an agent that scans code for security issues"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created agent');
      expect(result.output).toContain('security-scanner');
    });

    it('should handle force flag', async () => {
      // Create agent first time
      runCLI('create duplicate-agent --template basic');
      
      // Try to create again without force (should fail)
      const result1 = runCLI('create duplicate-agent --template basic');
      expect(result1.success).toBe(false);
      expect(result1.output).toContain('already exists');

      // Create with force (should succeed)
      const result2 = runCLI('create duplicate-agent --template basic --force');
      expect(result2.success).toBe(true);
      expect(result2.output).toContain('Created agent');
    });
  });

  describe('batch operations', () => {
    it('should validate all agents with wildcard', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = ['agent-a', 'agent-b', 'agent-c'];
      
      for (const name of agents) {
        const agent = createValidAgent({ 
          name,
          description: `${name} description`
        });
        
        await writeFile(
          join(agentsDir, `${name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = runCLI('validate *');
      expect(result.success).toBe(true);
      expect(result.output).toContain('agent-a');
      expect(result.output).toContain('agent-b');
      expect(result.output).toContain('agent-c');
    });

    it('should fix all agents with --all flag', async () => {
      const agentsDir = join(tempDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const agents = ['fix-a', 'fix-b'];
      
      for (const name of agents) {
        const agent = {
          name,
          // Missing required fields
        };
        
        await writeFile(
          join(agentsDir, `${name}.json`),
          JSON.stringify(agent, null, 2)
        );
      }

      const result = runCLI('fix --all');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Fixed 2 agents');
    });
  });

  describe('error handling', () => {
    it('should handle unknown command', () => {
      const result = runCLI('unknown-command');
      expect(result.success).toBe(false);
      expect(result.output).toContain('Unknown command');
    });

    it('should handle missing agent name for create', () => {
      const result = runCLI('create');
      expect(result.success).toBe(false);
      expect(result.output).toContain('Agent name is required');
    });

    it('should handle non-existent agent for validate', () => {
      const result = runCLI('validate non-existent-agent');
      expect(result.success).toBe(false);
      expect(result.output).toContain('not found');
    });

    it('should handle no agents directory', () => {
      const result = runCLI('validate', join(tempDir, 'empty'));
      expect(result.success).toBe(false);
      expect(result.output).toContain('No agents found');
    });
  });
});