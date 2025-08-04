#!/usr/bin/env node

/**
 * Example: CI/CD Integration for Claude Flow Agent Toolkit
 * 
 * This example shows how to integrate agent validation into your
 * CI/CD pipeline for automated quality checks.
 */

import { validator, analyzer, fixer } from '../src/index.mjs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * CI Runner for agent validation
 */
class CIRunner {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      autoFix: options.autoFix || false,
      failOnWarnings: options.failOnWarnings || false,
      outputFormat: options.outputFormat || 'junit',
      outputFile: options.outputFile || 'agent-validation-results.xml',
      ...options
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      fixed: 0,
      warnings: 0,
      errors: [],
      testCases: []
    };
  }
  
  /**
   * Run validation on all agents
   */
  async run() {
    console.log('Claude Flow Agent CI Runner\n');
    console.log(`Project root: ${this.options.projectRoot}`);
    console.log(`Auto-fix: ${this.options.autoFix}`);
    console.log(`Fail on warnings: ${this.options.failOnWarnings}\n`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Validate all agents
      await this.validateAgents();
      
      // Step 2: Run system analysis
      await this.analyzeSystem();
      
      // Step 3: Generate report
      const report = await this.generateReport();
      
      // Step 4: Output results
      await this.outputResults(report);
      
      const duration = Date.now() - startTime;
      console.log(`\nCI run completed in ${duration}ms`);
      
      // Determine exit code
      const hasFailures = this.results.failed > 0 || 
        (this.options.failOnWarnings && this.results.warnings > 0);
      
      return {
        success: !hasFailures,
        results: this.results,
        report
      };
    } catch (error) {
      console.error('CI run failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }
  
  /**
   * Validate all agents in the project
   */
  async validateAgents() {
    console.log('Running agent validation...\n');
    
    const validationResult = await validator.validateAll(this.options.projectRoot);
    
    for (const result of validationResult.results) {
      const testCase = {
        name: `validate-${result.name}`,
        className: 'AgentValidation',
        time: 0,
        status: 'passed',
        errors: [],
        warnings: []
      };
      
      if (!result.valid) {
        if (this.options.autoFix) {
          // Attempt to fix the agent
          console.log(`Attempting to fix ${result.name}...`);
          try {
            const fixResult = await fixer.fixAgent(
              join(this.options.projectRoot, '.claude', 'agents', `${result.name}.json`)
            );
            
            if (fixResult.fixed) {
              console.log(`✓ Fixed ${result.name}`);
              this.results.fixed++;
              testCase.status = 'fixed';
            } else {
              console.log(`✗ Could not fix ${result.name}`);
              this.results.failed++;
              testCase.status = 'failed';
              testCase.errors = result.errors;
            }
          } catch (error) {
            console.error(`✗ Error fixing ${result.name}: ${error.message}`);
            this.results.failed++;
            testCase.status = 'failed';
            testCase.errors = [...result.errors, { message: error.message }];
          }
        } else {
          console.log(`✗ ${result.name} - ${result.errors.length} errors`);
          this.results.failed++;
          testCase.status = 'failed';
          testCase.errors = result.errors;
        }
      } else {
        console.log(`✓ ${result.name}`);
        this.results.passed++;
      }
      
      // Check for warnings
      if (result.warnings && result.warnings.length > 0) {
        this.results.warnings += result.warnings.length;
        testCase.warnings = result.warnings;
        console.log(`  ⚠ ${result.warnings.length} warnings`);
      }
      
      this.results.testCases.push(testCase);
    }
  }
  
  /**
   * Analyze the agent system
   */
  async analyzeSystem() {
    console.log('\nRunning system analysis...\n');
    
    const analysis = await analyzer.analyze(this.options.projectRoot);
    
    const testCase = {
      name: 'system-analysis',
      className: 'AgentSystemAnalysis',
      time: 0,
      status: 'passed',
      systemInfo: {
        totalAgents: analysis.summary.totalAgents,
        validAgents: analysis.summary.validAgents,
        capabilities: Object.keys(analysis.capabilities).length,
        tools: Object.keys(analysis.tools).length
      }
    };
    
    // Check for system-level issues
    if (analysis.issues && analysis.issues.length > 0) {
      const errors = analysis.issues.filter(i => i.type === 'error');
      const warnings = analysis.issues.filter(i => i.type === 'warning');
      
      if (errors.length > 0) {
        testCase.status = 'failed';
        testCase.errors = errors;
        this.results.failed++;
      }
      
      if (warnings.length > 0) {
        testCase.warnings = warnings;
        this.results.warnings += warnings.length;
      }
    } else {
      this.results.passed++;
    }
    
    this.results.testCases.push(testCase);
    this.results.analysis = analysis;
  }
  
  /**
   * Generate CI report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: this.options.projectRoot,
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        fixed: this.results.fixed,
        warnings: this.results.warnings
      },
      testCases: this.results.testCases,
      analysis: this.results.analysis
    };
    
    return report;
  }
  
  /**
   * Output results in various formats
   */
  async outputResults(report) {
    switch (this.options.outputFormat) {
      case 'junit':
        await this.outputJUnit(report);
        break;
      case 'json':
        await this.outputJSON(report);
        break;
      case 'markdown':
        await this.outputMarkdown(report);
        break;
      default:
        await this.outputConsole(report);
    }
  }
  
  /**
   * Output JUnit XML format
   */
  async outputJUnit(report) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Claude Flow Agent Validation" tests="${report.summary.total}" failures="${report.summary.failed}" warnings="${report.summary.warnings}" timestamp="${report.timestamp}">
  <testsuite name="AgentValidation" tests="${report.testCases.length}" failures="${report.summary.failed}">
${report.testCases.map(tc => this.formatTestCase(tc)).join('\n')}
  </testsuite>
</testsuites>`;
    
    await writeFile(this.options.outputFile, xml);
    console.log(`\nResults written to ${this.options.outputFile}`);
  }
  
  /**
   * Format a test case for JUnit XML
   */
  formatTestCase(testCase) {
    let xml = `    <testcase name="${testCase.name}" classname="${testCase.className}" time="${testCase.time}">`;
    
    if (testCase.status === 'failed' && testCase.errors) {
      testCase.errors.forEach(error => {
        xml += `\n      <failure message="${this.escapeXml(error.message)}" type="ValidationError">`;
        xml += `\n        ${this.escapeXml(JSON.stringify(error, null, 2))}`;
        xml += `\n      </failure>`;
      });
    }
    
    if (testCase.warnings) {
      testCase.warnings.forEach(warning => {
        xml += `\n      <system-out>WARNING: ${this.escapeXml(warning.message)}</system-out>`;
      });
    }
    
    xml += `\n    </testcase>`;
    return xml;
  }
  
  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Output JSON format
   */
  async outputJSON(report) {
    await writeFile(this.options.outputFile, JSON.stringify(report, null, 2));
    console.log(`\nResults written to ${this.options.outputFile}`);
  }
  
  /**
   * Output Markdown format
   */
  async outputMarkdown(report) {
    let md = `# Claude Flow Agent Validation Report\n\n`;
    md += `**Date**: ${report.timestamp}\n`;
    md += `**Project**: ${report.project}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${report.summary.total} |\n`;
    md += `| Passed | ${report.summary.passed} |\n`;
    md += `| Failed | ${report.summary.failed} |\n`;
    md += `| Fixed | ${report.summary.fixed} |\n`;
    md += `| Warnings | ${report.summary.warnings} |\n\n`;
    
    if (report.summary.failed > 0) {
      md += `## Failed Tests\n\n`;
      report.testCases.filter(tc => tc.status === 'failed').forEach(tc => {
        md += `### ${tc.name}\n\n`;
        if (tc.errors) {
          tc.errors.forEach(error => {
            md += `- ❌ ${error.message}\n`;
          });
        }
        md += '\n';
      });
    }
    
    await writeFile(this.options.outputFile, md);
    console.log(`\nResults written to ${this.options.outputFile}`);
  }
  
  /**
   * Output to console
   */
  async outputConsole(report) {
    console.log('\n=== CI Results ===\n');
    console.log(`Total: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Fixed: ${report.summary.fixed}`);
    console.log(`Warnings: ${report.summary.warnings}`);
  }
}

/**
 * GitHub Actions integration
 */
async function runGitHubActions() {
  const options = {
    projectRoot: process.env.GITHUB_WORKSPACE || process.cwd(),
    autoFix: process.env.AUTO_FIX === 'true',
    failOnWarnings: process.env.FAIL_ON_WARNINGS === 'true',
    outputFormat: 'junit',
    outputFile: 'test-results/agent-validation.xml'
  };
  
  const runner = new CIRunner(options);
  const result = await runner.run();
  
  // Set GitHub Actions outputs
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `passed=${result.results.passed}`,
      `failed=${result.results.failed}`,
      `warnings=${result.results.warnings}`,
      `fixed=${result.results.fixed}`
    ].join('\n');
    
    await writeFile(process.env.GITHUB_OUTPUT, output);
  }
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

/**
 * Example usage
 */
async function main() {
  console.log('Claude Flow CI Integration Example\n');
  
  // Example 1: Basic CI run
  console.log('Example 1: Basic CI validation');
  console.log('==============================\n');
  
  const basicRunner = new CIRunner({
    outputFormat: 'console'
  });
  
  const basicResult = await basicRunner.run();
  console.log(`\nCI run ${basicResult.success ? 'passed' : 'failed'}`);
  
  // Example 2: CI with auto-fix
  console.log('\n\nExample 2: CI with auto-fix enabled');
  console.log('===================================\n');
  
  const fixRunner = new CIRunner({
    autoFix: true,
    outputFormat: 'json',
    outputFile: 'ci-results.json'
  });
  
  const fixResult = await fixRunner.run();
  console.log(`\nFixed ${fixResult.results.fixed} agents`);
  
  // Example 3: GitHub Actions configuration
  console.log('\n\nExample 3: GitHub Actions workflow');
  console.log('=================================\n');
  console.log('Add this to .github/workflows/agent-validation.yml:\n');
  
  const workflowYaml = `name: Agent Validation

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Validate agents
      run: node examples/ci-integration.mjs
      env:
        AUTO_FIX: false
        FAIL_ON_WARNINGS: true
        
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: test-results/
        
    - name: Publish test results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: test-results/**/*.xml`;
  
  console.log(workflowYaml);
}

// Export for use as a library
export { CIRunner, runGitHubActions };

// Run appropriate function based on environment
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    runGitHubActions().catch(error => {
      console.error('CI run failed:', error);
      process.exit(1);
    });
  } else {
    main().catch(console.error);
  }
}