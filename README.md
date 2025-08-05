# Claude Flow Agent Toolkit

[![npm version](https://badge.fury.io/js/@aigentics%2Fagent-toolkit.svg)](https://www.npmjs.com/package/@aigentics/agent-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/teemulinna/agent-toolkit/actions/workflows/node.js.yml/badge.svg)](https://github.com/teemulinna/agent-toolkit/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/teemulinna/agent-toolkit/branch/main/graph/badge.svg)](https://codecov.io/gh/teemulinna/agent-toolkit)

> 🤖 A comprehensive toolkit for validating, fixing, and managing Claude Flow AI agent systems

## Features

- **🔍 Validation**: Comprehensive validation of agent configurations
- **🔧 Auto-Fix**: Automatically fix common configuration issues
- **📊 Analysis**: Deep analysis of agent systems with recommendations
- **✨ Creation**: Create new agents with proper configuration
- **🎯 Standards**: Enforce consistent agent configuration standards

## Installation

```bash
npm install @aigentics/agent-toolkit
```

Or use directly with npx:

```bash
npx @aigentics/agent-toolkit validate
```

## Usage

### Command Line Interface

#### Validate Agents

```bash
# Validate all agents in default directory
agent-toolkit validate

# Validate with custom directory
agent-toolkit validate -d ./my-agents

# Output JSON report
agent-toolkit validate -f json -o validation-report.json

# Verbose output
agent-toolkit validate -v
```

#### Fix Agent Issues

```bash
# Fix all issues (with backup)
agent-toolkit fix

# Dry run - see what would be fixed
agent-toolkit fix --dry-run

# Fix without creating backups
agent-toolkit fix --no-backup

# Fix specific issues
agent-toolkit fix --tools-format
agent-toolkit fix --type-mismatches
```

#### Analyze Agent System

```bash
# Analyze agent system
agent-toolkit analyze

# Output analysis as JSON
agent-toolkit analyze -f json -o analysis.json
```

#### Create New Agents

```bash
# Create a basic agent
agent-toolkit create my-agent

# Create with specific type
agent-toolkit create my-swarm-agent -t swarm

# Interactive creation
agent-toolkit create my-agent -i

# Use a template
agent-toolkit create my-github-agent --template github-integration
```

### Programmatic API

```javascript
import { 
    AgentValidator, 
    AgentFixer, 
    AgentAnalyzer, 
    AgentCreator 
} from '@aigentics/agent-toolkit';

// Validate agents
const validator = new AgentValidator({
    agentsDir: './.claude/agents'
});
const results = await validator.validateAll();

// Fix issues
const fixer = new AgentFixer({
    dryRun: false,
    backup: true
});
const fixResults = await fixer.fixAll();

// Analyze system
const analyzer = new AgentAnalyzer();
const analysis = await analyzer.analyze();

// Create new agent
const creator = new AgentCreator();
const agent = await creator.create({
    name: 'my-agent',
    type: 'core',
    description: 'My custom agent',
    capabilities: ['task1', 'task2']
});
```

## Configuration Schema

### Required Fields

All agents must have these fields in their YAML frontmatter:

- `name` - Agent identifier (kebab-case)
- `type` - Agent type (see valid types below)
- `color` - Hex color code
- `description` - Agent description
- `version` - Semantic version (e.g., 1.0.0)
- `priority` - Priority level (high, medium, low)
- `capabilities` - Array of capabilities
- `triggers` - Activation triggers
- `tools` - Tool access configuration
- `constraints` - Execution constraints
- `communication` - Inter-agent communication
- `dependencies` - Agent dependencies
- `resources` - Resource limits
- `execution` - Execution settings
- `security` - Security configuration
- `monitoring` - Monitoring settings
- `hooks` - Pre/post execution hooks

### Valid Agent Types

- `core` - Core functionality agents
- `swarm` - Swarm coordination agents
- `consensus` - Consensus protocol agents
- `github` - GitHub integration agents
- `testing` - Testing and validation agents
- `architecture` - System architecture agents
- `documentation` - Documentation agents
- `analysis` - Code analysis agents
- `specialized` - Domain-specific agents
- `devops` - DevOps and CI/CD agents
- `optimization` - Performance optimization agents
- `templates` - Template and boilerplate agents
- `data` - Data processing agents
- `hive-mind` - Collective intelligence agents
- `sparc` - SPARC methodology agents

### Directory Organization

All directories are functional and can contain agents of any type. This allows for flexible organization where agents are grouped by their domain or purpose rather than strictly by type.

For example:
- `consensus/` can contain swarm coordinators, analysis agents, or any type that works with consensus protocols
- `github/` can contain architecture agents, swarm agents, or any type related to GitHub operations
- `core/` can contain planning agents, research agents, or any type providing core functionality

Common directories:
- `core/` - Core functionality agents
- `swarm/` - Swarm coordination and multi-agent systems
- `consensus/` - Consensus protocols and distributed systems
- `github/` - GitHub integration and repository management
- `testing/` - Testing and validation
- `architecture/` - System design and architecture
- `documentation/` - Documentation generation
- `analysis/` - Code analysis and review
- `specialized/` - Domain-specific agents
- `templates/` - Template and boilerplate generators
- `sparc/` - SPARC methodology agents
- `hive-mind/` - Collective intelligence
- `development/` - Development workflow
- `devops/` - DevOps and CI/CD
- `optimization/` - Performance optimization
- `data/` - Data processing

## Common Issues and Fixes

### Tools Format
GitHub agents often have tools in array format. The toolkit automatically converts to object format:
```yaml
# Before (array)
tools: [Read, Write, Bash]

# After (object)
tools:
  allowed: [Read, Write, Bash]
  restricted: [Task]
  conditional: []
```

### Type Mismatches
The toolkit can fix type mismatches using intelligent mapping:
- `developer` → `core`
- `coordinator` → `swarm`
- `analyst` → `analysis`
- etc.

### Missing Fields
The toolkit automatically adds missing required fields with sensible defaults based on agent type.

## Best Practices

1. **Always validate** before deployment
2. **Use consistent naming** (kebab-case)
3. **Define clear capabilities** for each agent
4. **Set appropriate security constraints**
5. **Enable monitoring** for production agents
6. **Document agent purpose** and usage
7. **Test agents** in isolation first

## Examples

### Validation Success (100%)
```
📊 Validation Summary:
   ✅ Valid: 68
   ⚠️  Warnings: 0
   ❌ Errors: 0
   📁 Total: 68

📈 Statistics by Agent Type:
   core         | 16 total | 16 valid (100%)
   swarm        | 12 total | 12 valid (100%)
   github       | 16 total | 16 valid (100%)
   ...
```

### Creating a Swarm Coordinator
```bash
agent-toolkit create swarm-coordinator \
  -t swarm \
  -d "Coordinates multi-agent swarms" \
  -c "swarm_init,topology_optimization,agent_orchestration"
```

## Contributing

Contributions are welcome! Please ensure all agents pass validation before submitting PRs.

## License

MIT