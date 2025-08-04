#!/usr/bin/env node

/**
 * Example: Custom validators for Claude Flow Agent Toolkit
 * 
 * This example shows how to create and use custom validation rules
 * for your specific agent requirements.
 */

import { validator } from '../src/index.mjs';

/**
 * Custom validator for ensuring agents follow naming conventions
 */
function validateNamingConvention(agent) {
  const errors = [];
  
  // Check agent name format (kebab-case)
  if (!/^[a-z]+(-[a-z]+)*$/.test(agent.name)) {
    errors.push({
      field: 'name',
      message: 'Agent name must be in kebab-case (lowercase with hyphens)',
      severity: 'error'
    });
  }
  
  // Check capability naming (lowercase, no spaces)
  if (agent.capabilities) {
    agent.capabilities.forEach((cap, index) => {
      if (!/^[a-z-]+$/.test(cap)) {
        errors.push({
          field: `capabilities[${index}]`,
          message: `Capability "${cap}" must be lowercase with hyphens only`,
          severity: 'error'
        });
      }
    });
  }
  
  return errors;
}

/**
 * Custom validator for security constraints
 */
function validateSecurityConstraints(agent) {
  const errors = [];
  const warnings = [];
  
  // Check for dangerous tool combinations
  const dangerousCombo = ['Bash', 'Write', 'WebFetch'];
  const hasAllDangerous = dangerousCombo.every(tool => 
    agent.tools && agent.tools.includes(tool)
  );
  
  if (hasAllDangerous) {
    warnings.push({
      field: 'tools',
      message: 'Agent has full system access (Bash + Write + WebFetch). Ensure this is intended.',
      severity: 'warning'
    });
  }
  
  // Check for sensitive data handling
  if (agent.prompts && agent.prompts.main) {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_\s-]?key/i,
      /credential/i
    ];
    
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(agent.prompts.main)) {
        warnings.push({
          field: 'prompts.main',
          message: `Prompt mentions sensitive data (${pattern.source}). Ensure proper handling.`,
          severity: 'warning'
        });
      }
    });
  }
  
  // Check for file system restrictions
  if (agent.tools && agent.tools.includes('Write')) {
    if (!agent.config || !agent.config.allowedPaths) {
      warnings.push({
        field: 'config.allowedPaths',
        message: 'Agent has Write access but no path restrictions defined',
        severity: 'warning'
      });
    }
  }
  
  return [...errors, ...warnings];
}

/**
 * Custom validator for performance constraints
 */
function validatePerformanceConstraints(agent) {
  const errors = [];
  const warnings = [];
  
  // Check for reasonable capability count
  if (agent.capabilities && agent.capabilities.length > 10) {
    warnings.push({
      field: 'capabilities',
      message: `Agent has ${agent.capabilities.length} capabilities. Consider splitting into multiple specialized agents.`,
      severity: 'warning'
    });
  }
  
  // Check for reasonable tool count
  if (agent.tools && agent.tools.length > 15) {
    warnings.push({
      field: 'tools',
      message: `Agent has ${agent.tools.length} tools. This may impact performance.`,
      severity: 'warning'
    });
  }
  
  // Check prompt length
  if (agent.prompts) {
    Object.entries(agent.prompts).forEach(([key, value]) => {
      if (value && value.length > 5000) {
        warnings.push({
          field: `prompts.${key}`,
          message: `Prompt is ${value.length} characters long. Consider making it more concise.`,
          severity: 'warning'
        });
      }
    });
  }
  
  // Check for timeout configuration
  if (agent.tools && agent.tools.includes('Bash') && 
      (!agent.config || !agent.config.timeout)) {
    warnings.push({
      field: 'config.timeout',
      message: 'Agent uses Bash but has no timeout configured',
      severity: 'warning'
    });
  }
  
  return [...errors, ...warnings];
}

/**
 * Custom validator for dependency management
 */
function validateDependencies(agent, allAgents = []) {
  const errors = [];
  const warnings = [];
  
  if (agent.dependencies) {
    // Check if dependencies exist
    agent.dependencies.forEach(dep => {
      if (!allAgents.find(a => a.name === dep)) {
        errors.push({
          field: 'dependencies',
          message: `Dependency "${dep}" not found in agent system`,
          severity: 'error'
        });
      }
    });
    
    // Check for circular dependencies
    const visited = new Set();
    const recursionStack = new Set();
    
    function hasCycle(agentName, path = []) {
      if (recursionStack.has(agentName)) {
        errors.push({
          field: 'dependencies',
          message: `Circular dependency detected: ${[...path, agentName].join(' -> ')}`,
          severity: 'error'
        });
        return true;
      }
      
      if (visited.has(agentName)) return false;
      
      visited.add(agentName);
      recursionStack.add(agentName);
      
      const currentAgent = allAgents.find(a => a.name === agentName);
      if (currentAgent && currentAgent.dependencies) {
        for (const dep of currentAgent.dependencies) {
          if (hasCycle(dep, [...path, agentName])) {
            return true;
          }
        }
      }
      
      recursionStack.delete(agentName);
      return false;
    }
    
    hasCycle(agent.name);
  }
  
  return [...errors, ...warnings];
}

/**
 * Custom validator for team/organization standards
 */
function validateTeamStandards(agent) {
  const errors = [];
  const warnings = [];
  
  // Require specific metadata
  if (!agent.metadata) {
    errors.push({
      field: 'metadata',
      message: 'Metadata is required by team standards',
      severity: 'error'
    });
  } else {
    const requiredMetadata = ['author', 'team', 'lastReviewed'];
    requiredMetadata.forEach(field => {
      if (!agent.metadata[field]) {
        errors.push({
          field: `metadata.${field}`,
          message: `Metadata field "${field}" is required by team standards`,
          severity: 'error'
        });
      }
    });
  }
  
  // Check documentation requirements
  if (!agent.documentation || !agent.documentation.usage) {
    warnings.push({
      field: 'documentation.usage',
      message: 'Usage documentation is recommended by team standards',
      severity: 'warning'
    });
  }
  
  // Check for test coverage requirement
  if (!agent.metadata || !agent.metadata.testCoverage) {
    warnings.push({
      field: 'metadata.testCoverage',
      message: 'Test coverage information should be included',
      severity: 'warning'
    });
  }
  
  return [...errors, ...warnings];
}

/**
 * Composite validator that runs all custom validators
 */
class CustomValidator {
  constructor(options = {}) {
    this.validators = [];
    this.options = options;
  }
  
  addValidator(name, validatorFn, options = {}) {
    this.validators.push({
      name,
      fn: validatorFn,
      enabled: options.enabled !== false,
      severity: options.severity || 'error'
    });
  }
  
  async validate(agent, context = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    // First run standard validation
    const standardValidation = await validator.validate(agent);
    if (!standardValidation.valid) {
      results.valid = false;
      results.errors.push(...standardValidation.errors);
    }
    
    // Then run custom validators
    for (const customValidator of this.validators) {
      if (!customValidator.enabled) continue;
      
      try {
        const issues = await customValidator.fn(agent, context);
        issues.forEach(issue => {
          if (issue.severity === 'error') {
            results.valid = false;
            results.errors.push({
              validator: customValidator.name,
              ...issue
            });
          } else {
            results.warnings.push({
              validator: customValidator.name,
              ...issue
            });
          }
        });
      } catch (error) {
        results.errors.push({
          validator: customValidator.name,
          message: `Validator error: ${error.message}`,
          severity: 'error'
        });
        results.valid = false;
      }
    }
    
    return results;
  }
}

/**
 * Example usage
 */
async function main() {
  console.log('Claude Flow Custom Validators Example\n');
  
  // Create a custom validator instance
  const customValidator = new CustomValidator();
  
  // Add our custom validators
  customValidator.addValidator('naming', validateNamingConvention);
  customValidator.addValidator('security', validateSecurityConstraints);
  customValidator.addValidator('performance', validatePerformanceConstraints);
  customValidator.addValidator('team-standards', validateTeamStandards, {
    enabled: true // Can be toggled based on environment
  });
  
  // Example agent with various issues
  const testAgent = {
    name: 'Test_Agent', // Bad naming (should be kebab-case)
    version: '1.0.0',
    description: 'Test agent for validation',
    capabilities: [
      'code-review',
      'Test Analysis', // Bad naming
      'deploy',
      'monitor',
      'analyze',
      'report',
      'optimize',
      'debug',
      'profile',
      'benchmark',
      'audit',
      'scan' // Too many capabilities
    ],
    tools: ['Read', 'Write', 'Bash', 'WebFetch'], // Dangerous combination
    prompts: {
      main: 'You are an agent that handles API keys and passwords securely.' // Mentions sensitive data
    },
    dependencies: ['non-existent-agent'],
    // Missing metadata required by team standards
  };
  
  console.log('Validating test agent...\n');
  const validation = await customValidator.validate(testAgent);
  
  console.log(`Valid: ${validation.valid}`);
  console.log(`\nErrors (${validation.errors.length}):`);
  validation.errors.forEach(error => {
    console.log(`  - [${error.validator || 'standard'}] ${error.field}: ${error.message}`);
  });
  
  console.log(`\nWarnings (${validation.warnings.length}):`);
  validation.warnings.forEach(warning => {
    console.log(`  - [${warning.validator || 'standard'}] ${warning.field}: ${warning.message}`);
  });
  
  // Example of a well-formed agent
  console.log('\n\nExample of a well-formed agent:');
  const goodAgent = {
    name: 'code-reviewer',
    version: '1.0.0',
    description: 'Reviews code for quality and standards',
    capabilities: ['code-review', 'suggest-improvements'],
    tools: ['Read', 'Grep', 'Glob'],
    prompts: {
      main: 'You are a code reviewer. Analyze code for quality, readability, and best practices.'
    },
    config: {
      timeout: 30000,
      allowedPaths: ['./src', './test']
    },
    metadata: {
      author: 'Team Alpha',
      team: 'DevTools',
      lastReviewed: new Date().toISOString(),
      testCoverage: 95
    },
    documentation: {
      usage: 'Use this agent to review pull requests and provide feedback'
    }
  };
  
  const goodValidation = await customValidator.validate(goodAgent);
  console.log(`\nValid: ${goodValidation.valid}`);
  console.log(`Errors: ${goodValidation.errors.length}`);
  console.log(`Warnings: ${goodValidation.warnings.length}`);
}

// Export for use as a library
export {
  validateNamingConvention,
  validateSecurityConstraints,
  validatePerformanceConstraints,
  validateDependencies,
  validateTeamStandards,
  CustomValidator
};

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}