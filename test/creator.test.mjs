import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentCreator } from '../lib/creator.mjs';
import { extractYamlFrontmatter } from '../lib/utils.mjs';
import { readFile, access, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { constants } from 'fs';

describe('Creator', () => {
  let tempDir;
  let creator;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `creator-test-${Date.now()}`);
    creator = new AgentCreator({ baseDir: tempDir });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('create', () => {
    it('should create a basic agent from template', async () => {
      const result = await creator.create({
        name: 'test-agent',
        template: 'basic',
        outputDir: tempDir
      });

      expect(result.path).toBe(join(tempDir, '.claude', 'agents', 'core', 'test-agent.md'));

      // Verify file exists
      await expect(access(result.path, constants.F_OK)).resolves.toBeUndefined();

      // Verify content
      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      expect(content).toMatchObject({
        name: 'test-agent',
        version: '1.0.0',
        description: expect.any(String),
        capabilities: expect.any(Array),
        tools: expect.any(Array),
        prompts: expect.objectContaining({
          main: expect.any(String)
        })
      });
    });

    it('should create a specialized agent', async () => {
      const result = await creator.create({
        name: 'code-reviewer',
        template: 'reviewer',
        outputDir: tempDir
      });

      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      
      expect(content.name).toBe('code-reviewer');
      expect(content.capabilities).toBeDefined();
      expect(content.tools.allowed).toBeDefined();
      expect(content.description).toBeDefined();
    });

    it('should create agent with custom configuration', async () => {
      const customConfig = {
        description: 'Custom test agent',
        capabilities: ['test', 'validate'],
        tools: ['Read', 'Write', 'Bash'],
        prompts: {
          main: 'You are a custom test agent',
          error: 'Handle errors gracefully'
        },
        config: {
          maxRetries: 3,
          timeout: 30000
        }
      };

      const result = await creator.create({
        name: 'custom-agent',
        template: 'basic',
        outputDir: tempDir,
        config: customConfig
      });

      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      
      expect(content).toMatchObject({
        name: 'custom-agent',
        version: '1.0.0',
        description: 'Custom test agent',
        capabilities: ['test', 'validate'],
        tools: ['Read', 'Write', 'Bash'],
        prompts: {
          main: 'You are a custom test agent',
          error: 'Handle errors gracefully'
        },
        config: {
          maxRetries: 3,
          timeout: 30000
        }
      });
    });

    it('should create orchestrator agent', async () => {
      const result = await creator.create({
        name: 'task-orchestrator',
        template: 'orchestrator',
        outputDir: tempDir
      });

      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      
      expect(content.capabilities).toBeDefined();
      expect(content.tools).toBeDefined();
      expect(content.description).toBeDefined();
    });

    it('should create analyzer agent', async () => {
      const result = await creator.create({
        name: 'system-analyzer',
        template: 'analyzer',
        outputDir: tempDir
      });

      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      
      expect(content.capabilities).toBeDefined();
      expect(content.tools).toBeDefined();
      expect(content.description).toBeDefined();
    });

    it('should create implementer agent', async () => {
      const result = await creator.create({
        name: 'feature-implementer',
        template: 'implementer',
        outputDir: tempDir
      });

      const rawContent = await readFile(result.path, 'utf-8');
      const [content] = extractYamlFrontmatter(rawContent);
      
      expect(content.capabilities).toBeDefined();
      expect(content.tools).toBeDefined();
      expect(content.description).toBeDefined();
    });

    it('should throw error for invalid template', async () => {
      await expect(creator.create({
        name: 'test-agent',
        template: 'invalid-template',
        outputDir: tempDir
      })).rejects.toThrow('Unknown template: invalid-template');
    });

    it('should throw error for invalid agent name', async () => {
      await expect(creator.create({
        name: 'test agent with spaces',
        template: 'basic',
        outputDir: tempDir
      })).rejects.toThrow('Invalid agent name');
    });

    it('should not overwrite existing agent without force flag', async () => {
      // Create first agent
      await creator.create({
        name: 'existing-agent',
        template: 'basic',
        outputDir: tempDir
      });

      // Try to create again without force
      await expect(creator.create({
        name: 'existing-agent',
        template: 'basic',
        outputDir: tempDir
      })).rejects.toThrow('already exists');
    });

    it('should overwrite existing agent with force flag', async () => {
      // Create first agent
      await creator.create({
        name: 'existing-agent',
        template: 'basic',
        outputDir: tempDir
      });

      // Create again with force
      const agentPath = await creator.create({
        name: 'existing-agent',
        template: 'reviewer',
        outputDir: tempDir,
        force: true
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      expect(content.capabilities).toContain('review'); // Should be reviewer template
    });

    it('should merge custom config with template', async () => {
      const agentPath = await creator.create({
        name: 'merged-agent',
        template: 'reviewer',
        outputDir: tempDir,
        config: {
          capabilities: ['review', 'custom-capability'],
          tools: ['CustomTool'],
          config: {
            customOption: true
          }
        }
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      
      // Should have both template and custom capabilities
      expect(content.capabilities).toContain('review');
      expect(content.capabilities).toContain('custom-capability');
      
      // Should have merged tools
      expect(content.tools).toContain('Read'); // From template
      expect(content.tools).toContain('CustomTool'); // From custom
      
      // Should have custom config
      expect(content.config.customOption).toBe(true);
    });

    it('should create agent with dependencies', async () => {
      const agentPath = await creator.create({
        name: 'dependent-agent',
        template: 'basic',
        outputDir: tempDir,
        config: {
          dependencies: ['analyzer', 'validator']
        }
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      expect(content.dependencies).toEqual(['analyzer', 'validator']);
    });

    it('should create agent with hooks', async () => {
      const agentPath = await creator.create({
        name: 'hooked-agent',
        template: 'basic',
        outputDir: tempDir,
        config: {
          hooks: {
            preTask: 'console.log("Starting task");',
            postTask: 'console.log("Task completed");'
          }
        }
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      expect(content.hooks).toEqual({
        preTask: 'console.log("Starting task");',
        postTask: 'console.log("Task completed");'
      });
    });
  });

  describe('createBatch', () => {
    it('should create multiple agents from batch config', async () => {
      const batchConfig = [
        {
          name: 'batch-agent-1',
          template: 'basic'
        },
        {
          name: 'batch-agent-2',
          template: 'reviewer'
        },
        {
          name: 'batch-agent-3',
          template: 'orchestrator'
        }
      ];

      const results = await creator.createBatch({
        agents: batchConfig,
        outputDir: tempDir
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      // Verify all agents were created
      for (const agent of batchConfig) {
        const agentPath = join(tempDir, '.claude', 'agents', `${agent.name}.json`);
        await expect(access(agentPath, constants.F_OK)).resolves.toBeUndefined();
      }
    });

    it('should handle partial failures in batch creation', async () => {
      const batchConfig = [
        {
          name: 'valid-agent',
          template: 'basic'
        },
        {
          name: 'invalid agent name', // Invalid name
          template: 'basic'
        },
        {
          name: 'unknown-template',
          template: 'non-existent' // Invalid template
        }
      ];

      const results = await creator.createBatch({
        agents: batchConfig,
        outputDir: tempDir
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Invalid agent name');
      expect(results[2].success).toBe(false);
      expect(results[2].error).toContain('Unknown template');
    });

    it('should stop on first error if stopOnError is true', async () => {
      const batchConfig = [
        {
          name: 'agent-1',
          template: 'basic'
        },
        {
          name: 'invalid agent', // Will fail
          template: 'basic'
        },
        {
          name: 'agent-3',
          template: 'basic'
        }
      ];

      const results = await creator.createBatch({
        agents: batchConfig,
        outputDir: tempDir,
        stopOnError: true
      });

      expect(results).toHaveLength(2); // Should stop after error
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('templates', () => {
    it('should list available templates', () => {
      const templates = creator.listTemplates();
      
      expect(templates).toContain('basic');
      expect(templates).toContain('reviewer');
      expect(templates).toContain('orchestrator');
      expect(templates).toContain('analyzer');
      expect(templates).toContain('implementer');
      expect(templates).toContain('researcher');
      expect(templates).toContain('tester');
    });

    it('should get template details', () => {
      const template = creator.getTemplate('reviewer');
      
      expect(template).toBeDefined();
      expect(template.description).toContain('code review');
      expect(template.capabilities).toContain('review');
      expect(template.tools).toContain('Read');
    });

    it('should return null for non-existent template', () => {
      const template = creator.getTemplate('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('createFromPrompt', () => {
    it('should create agent from natural language prompt', async () => {
      const agentPath = await creator.createFromPrompt({
        prompt: 'Create an agent that can analyze Python code for security vulnerabilities',
        name: 'security-analyzer',
        outputDir: tempDir
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      
      expect(content.name).toBe('security-analyzer');
      expect(content.capabilities).toContain('analyze');
      expect(content.tools).toContain('Read');
      expect(content.tools).toContain('Grep');
      expect(content.prompts.main).toContain('security');
    });

    it('should create testing agent from prompt', async () => {
      const agentPath = await creator.createFromPrompt({
        prompt: 'I need an agent that can write and run unit tests',
        name: 'test-writer',
        outputDir: tempDir
      });

      const content = JSON.parse(await readFile(agentPath, 'utf-8'));
      
      expect(content.capabilities).toContain('test');
      expect(content.tools).toContain('Write');
      expect(content.tools).toContain('Bash');
      expect(content.prompts.main).toContain('test');
    });
  });
});