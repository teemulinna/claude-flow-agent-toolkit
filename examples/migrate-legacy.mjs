#!/usr/bin/env node

/**
 * Example: Migrate legacy agent formats to Claude Flow v2
 * 
 * This script demonstrates how to migrate agents from older formats
 * to the Claude Flow v2 standard format.
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { validator, fixer, creator } from '../src/index.mjs';

// Example legacy agent format (v1)
const legacyAgentV1 = {
  id: 'legacy-analyzer',
  type: 'analyzer',
  config: {
    name: 'Legacy Analyzer Agent',
    description: 'Analyzes code for issues',
    skills: ['code-analysis', 'pattern-detection'],
    permissions: ['file:read', 'file:write'],
    prompt: 'You are a code analyzer. Find issues and suggest improvements.'
  }
};

// Example legacy agent format (custom)
const customLegacyAgent = {
  agentName: 'custom-reviewer',
  agentType: 'reviewer',
  capabilities: {
    primary: ['review-code', 'suggest-improvements'],
    secondary: ['write-tests']
  },
  toolsAllowed: ['Read', 'Comment'],
  instructions: {
    main: 'Review code and provide feedback',
    onError: 'Report errors gracefully'
  }
};

/**
 * Migrate v1 format to v2
 */
function migrateV1ToV2(legacyAgent) {
  return {
    name: legacyAgent.id,
    version: '1.0.0',
    description: legacyAgent.config.description,
    capabilities: legacyAgent.config.skills,
    tools: mapPermissionsToTools(legacyAgent.config.permissions),
    prompts: {
      main: legacyAgent.config.prompt
    },
    metadata: {
      migratedFrom: 'v1',
      originalType: legacyAgent.type,
      migrationDate: new Date().toISOString()
    }
  };
}

/**
 * Migrate custom format to v2
 */
function migrateCustomToV2(customAgent) {
  return {
    name: customAgent.agentName,
    version: '1.0.0',
    description: `${customAgent.agentType} agent`,
    capabilities: [
      ...customAgent.capabilities.primary,
      ...customAgent.capabilities.secondary
    ],
    tools: customAgent.toolsAllowed,
    prompts: {
      main: customAgent.instructions.main,
      error: customAgent.instructions.onError
    },
    metadata: {
      migratedFrom: 'custom',
      originalType: customAgent.agentType,
      migrationDate: new Date().toISOString()
    }
  };
}

/**
 * Map legacy permissions to Claude Flow tools
 */
function mapPermissionsToTools(permissions) {
  const toolMap = {
    'file:read': 'Read',
    'file:write': 'Write',
    'file:edit': 'Edit',
    'system:execute': 'Bash',
    'web:fetch': 'WebFetch',
    'task:create': 'Task'
  };

  return permissions
    .map(perm => toolMap[perm])
    .filter(Boolean)
    .filter((tool, index, array) => array.indexOf(tool) === index); // Remove duplicates
}

/**
 * Detect legacy format type
 */
function detectLegacyFormat(agent) {
  if (agent.id && agent.type && agent.config) {
    return 'v1';
  } else if (agent.agentName && agent.agentType && agent.capabilities) {
    return 'custom';
  } else if (agent.name && agent.version) {
    return 'v2'; // Already in v2 format
  }
  return 'unknown';
}

/**
 * Migrate a single agent
 */
async function migrateAgent(agent, options = {}) {
  const format = detectLegacyFormat(agent);
  
  console.log(`Detected format: ${format}`);
  
  let v2Agent;
  
  switch (format) {
    case 'v1':
      v2Agent = migrateV1ToV2(agent);
      break;
    case 'custom':
      v2Agent = migrateCustomToV2(agent);
      break;
    case 'v2':
      console.log('Agent is already in v2 format');
      return agent;
    default:
      throw new Error('Unknown agent format');
  }
  
  // Validate the migrated agent
  const validation = await validator.validate(v2Agent);
  
  if (!validation.valid) {
    console.log('Migrated agent has validation errors, attempting to fix...');
    v2Agent = await fixer.fix(v2Agent);
    
    // Re-validate after fixing
    const revalidation = await validator.validate(v2Agent);
    if (!revalidation.valid) {
      console.error('Could not automatically fix all issues:');
      console.error(revalidation.errors);
      if (!options.force) {
        throw new Error('Migration failed due to validation errors');
      }
    }
  }
  
  return v2Agent;
}

/**
 * Migrate all agents in a directory
 */
async function migrateDirectory(sourceDir, targetDir, options = {}) {
  console.log(`Migrating agents from ${sourceDir} to ${targetDir}`);
  
  const files = await readdir(sourceDir);
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };
  
  for (const file of files) {
    if (!file.endsWith('.json')) {
      results.skipped.push(file);
      continue;
    }
    
    console.log(`\nMigrating ${file}...`);
    
    try {
      const content = await readFile(join(sourceDir, file), 'utf-8');
      const agent = JSON.parse(content);
      
      const migratedAgent = await migrateAgent(agent, options);
      
      const targetPath = join(targetDir, '.claude', 'agents', basename(file));
      await writeFile(targetPath, JSON.stringify(migratedAgent, null, 2));
      
      results.successful.push(file);
      console.log(`✓ Successfully migrated ${file}`);
    } catch (error) {
      results.failed.push({ file, error: error.message });
      console.error(`✗ Failed to migrate ${file}: ${error.message}`);
      
      if (!options.continueOnError) {
        throw error;
      }
    }
  }
  
  return results;
}

/**
 * Example usage
 */
async function main() {
  console.log('Claude Flow Agent Migration Tool\n');
  
  // Example 1: Migrate single v1 agent
  console.log('Example 1: Migrating v1 format agent');
  console.log('=====================================');
  const migratedV1 = await migrateAgent(legacyAgentV1);
  console.log('Migrated agent:', JSON.stringify(migratedV1, null, 2));
  
  console.log('\n');
  
  // Example 2: Migrate custom format agent
  console.log('Example 2: Migrating custom format agent');
  console.log('=======================================');
  const migratedCustom = await migrateAgent(customLegacyAgent);
  console.log('Migrated agent:', JSON.stringify(migratedCustom, null, 2));
  
  console.log('\n');
  
  // Example 3: Batch migration (commented out - requires actual directory)
  console.log('Example 3: Batch migration');
  console.log('=========================');
  console.log('To migrate a directory of agents:');
  console.log('');
  console.log('const results = await migrateDirectory(');
  console.log('  "./legacy-agents",');
  console.log('  "./migrated-agents",');
  console.log('  { continueOnError: true, force: false }');
  console.log(');');
  console.log('');
  console.log('console.log(`Migrated: ${results.successful.length}`);');
  console.log('console.log(`Failed: ${results.failed.length}`);');
  console.log('console.log(`Skipped: ${results.skipped.length}`);');
}

// Export functions for use as a library
export {
  migrateAgent,
  migrateDirectory,
  migrateV1ToV2,
  migrateCustomToV2,
  detectLegacyFormat,
  mapPermissionsToTools
};

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}