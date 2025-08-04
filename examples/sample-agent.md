---
name: sample-analyzer
type: analysis
color: '#FF9800'
description: Sample analyzer agent for code quality assessment
version: 1.0.0
priority: medium
capabilities:
  - code_quality_analysis
  - pattern_detection
  - metric_calculation
triggers:
  keywords:
    - analyze
    - quality
    - metrics
  patterns:
    - 'analyze.*code'
    - 'check.*quality'
  file_patterns:
    - '*.js'
    - '*.ts'
    - '*.jsx'
  context_patterns:
    - analysis
    - quality
tools:
  allowed:
    - Read
    - Grep
    - Glob
  restricted:
    - Write
    - Edit
    - Bash
    - Task
  conditional: []
constraints:
  max_file_operations: 50
  max_execution_time: 300
  allowed_paths:
    - src/**
    - lib/**
  forbidden_paths:
    - node_modules/**
    - .env*
    - secrets/**
  max_file_size: 1048576
  max_concurrent_operations: 3
communication:
  can_spawn: []
  can_delegate_to:
    - reporter
  requires_approval_from: []
  shares_context_with:
    - code-reviewer
  handoff_protocol:
    required_artifacts:
      - analysis-report
    validation_steps:
      - verify-metrics
dependencies:
  requires: []
  provides:
    - capability: code_analysis_service
      interface: v1
  conflicts: []
resources:
  memory_limit: 256MB
  cpu_quota: 500m
  execution_timeout: 300s
  concurrent_operations: 3
execution:
  parallelization:
    enabled: true
    max_concurrent: 3
    strategy: adaptive
  batching:
    enabled: true
    batch_size: 10
    timeout: 30s
security:
  sandboxing:
    enabled: true
    type: process
    restrictions:
      network: none
      filesystem: read-only
  audit:
    enabled: true
    events:
      - file-read
      - analysis-complete
    retention: 30d
monitoring:
  health_checks:
    enabled: true
    interval: 60s
  metrics:
    - name: files_analyzed
      type: counter
    - name: analysis_time
      type: histogram
    - name: issues_found
      type: gauge
hooks:
  pre: |
    echo "🔍 Starting code analysis: $TASK"
    # Validate file paths
    # Load analysis rules
  post: |
    echo "✅ Analysis complete: $TASK"
    # Generate report
    # Store metrics
---

# Sample Analyzer Agent

This is a sample agent demonstrating proper configuration for code analysis tasks.

## Purpose

Analyzes code quality and detects patterns across JavaScript/TypeScript projects.

## Core Capabilities

1. **Code Quality Analysis** - Assess code quality metrics
2. **Pattern Detection** - Find common anti-patterns
3. **Metric Calculation** - Calculate complexity and maintainability

## Usage Examples

### Basic Analysis
```bash
# Trigger: "analyze code quality in src/"
# The agent will scan all JS/TS files and generate a quality report
```

### Pattern Detection
```bash
# Trigger: "check for anti-patterns in the codebase"
# The agent will identify common issues and suggest improvements
```

## Integration

- Works with: code-reviewer agent for comprehensive reviews
- Provides: analysis reports that can be used by other agents
- Security: Read-only access ensures no code modifications

## Best Practices

1. Run analysis before code reviews
2. Use for continuous quality monitoring
3. Integrate with CI/CD pipelines
4. Review metrics trends over time