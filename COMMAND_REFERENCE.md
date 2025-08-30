# 🔧 Claude Flow Agent Toolkit - Complete Command Reference

## 📦 **NPX Usage (Recommended)**

```bash
# No installation required - always uses latest version
npx @aigentics/agent-toolkit <command>
```

---

## 🎯 **PRIMARY CLI TOOLS**

### **1. 🤖 Agent Management (`agent-toolkit`)**

**Full agent system management with validation, fixing, analysis, and creation.**

```bash
npx @aigentics/agent-toolkit agent-toolkit --help
```

#### **Commands:**

##### **`validate [agent-name]`** - Validate Agent Configurations
```bash
# Validate all agents in default directory
npx @aigentics/agent-toolkit agent-toolkit validate

# Validate specific agent
npx @aigentics/agent-toolkit agent-toolkit validate my-agent

# Options:
-d, --dir <directory>     # Agents directory (default: ".claude/agents")
-f, --format <format>     # Output format: text, json (default: "text")
-o, --output <file>       # Save results to file
-v, --verbose             # Detailed validation results

# Examples:
npx @aigentics/agent-toolkit agent-toolkit validate -v
npx @aigentics/agent-toolkit agent-toolkit validate -f json -o report.json
npx @aigentics/agent-toolkit agent-toolkit validate -d ./custom/agents/
```

##### **`fix [agent-name]`** - Fix Agent Configuration Issues
```bash
# Fix all agents with automatic backups
npx @aigentics/agent-toolkit agent-toolkit fix

# Fix specific agent
npx @aigentics/agent-toolkit agent-toolkit fix my-agent

# Options:
-d, --dir <directory>     # Agents directory (default: ".claude/agents")
--dry-run                 # Show what would be fixed without changes
--no-backup              # Skip creating backup files
-v, --verbose            # Detailed fix results
--tools-format           # Fix tools format issues specifically
--type-mismatches        # Fix type mismatches specifically  
--all                    # Fix all detected issues

# Examples:
npx @aigentics/agent-toolkit agent-toolkit fix --dry-run
npx @aigentics/agent-toolkit agent-toolkit fix --tools-format
npx @aigentics/agent-toolkit agent-toolkit fix --all -v
```

##### **`analyze`** - Analyze Agent System
```bash
# Analyze entire agent system for insights
npx @aigentics/agent-toolkit agent-toolkit analyze

# Options:
-d, --dir <directory>     # Agents directory (default: ".claude/agents")
-f, --format <format>     # Output format: text, json (default: "text")
-o, --output <file>       # Save analysis to file

# Examples:
npx @aigentics/agent-toolkit agent-toolkit analyze -f json
npx @aigentics/agent-toolkit agent-toolkit analyze -o system-analysis.txt
```

##### **`create [name]`** - Create New Agents
```bash
# Create basic agent
npx @aigentics/agent-toolkit agent-toolkit create my-agent

# Create with specific configuration
npx @aigentics/agent-toolkit agent-toolkit create my-swarm-agent -t swarm

# Options:
-t, --type <type>                   # Agent type (default: "core")
-d, --description <description>     # Agent description  
-c, --capabilities <capabilities>   # Comma-separated capabilities
--template <template>               # Use existing template
--dir <directory>                   # Target directory
-i, --interactive                   # Interactive creation mode
--tools <tools>                     # Comma-separated tools
--prompt <prompt>                   # Create from natural language
--force                            # Overwrite existing agent
--list-templates                   # Show available templates

# Examples:
npx @aigentics/agent-toolkit agent-toolkit create github-pr -t github -d "PR management agent"
npx @aigentics/agent-toolkit agent-toolkit create my-agent -i
npx @aigentics/agent-toolkit agent-toolkit create --list-templates
```

##### **`list-templates`** - List Available Agent Templates
```bash
npx @aigentics/agent-toolkit agent-toolkit list-templates
```

##### **`config`** - Show Configuration Information
```bash
npx @aigentics/agent-toolkit agent-toolkit config
```

---

### **2. 🔧 Hook Management (`claude-flow-hooks`)**

**Specialized tool for validating, fixing, and managing agent hook configurations.**

```bash
npx @aigentics/agent-toolkit claude-flow-hooks --help
```

#### **Commands:**

##### **`validate`** - Validate Agent Hooks
```bash
# Validate all agent hook configurations
npx @aigentics/agent-toolkit claude-flow-hooks validate

# Options:
-v, --verbose             # Show detailed validation results

# Examples:
npx @aigentics/agent-toolkit claude-flow-hooks validate
npx @aigentics/agent-toolkit claude-flow-hooks validate --verbose
```

##### **`auto-fix`** - Automatic Hook Fixes
```bash
# Apply safe automatic fixes to all agents
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix

# Options:
--dry-run                 # Show what would be fixed without changes

# Examples:
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix --dry-run
```

##### **`smart-fix`** - Context-Aware Intelligent Fixes
```bash
# Apply intelligent fixes based on agent type and context
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix

# Options:
--verbose                 # Show detailed contextual decisions

# Examples:
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix --verbose
```

##### **`interactive`** - Guided Interactive Fixing
```bash
# Interactively fix hooks with approval workflow
npx @aigentics/agent-toolkit claude-flow-hooks interactive

# Features:
# - Review each issue individually
# - Choose fix, skip, or custom solutions
# - See context and explanations
# - Approve changes before applying
```

##### **`status`** - Quick Status Overview
```bash
# Show current hook system health
npx @aigentics/agent-toolkit claude-flow-hooks status

# Output example:
# 📊 HOOK SYSTEM STATUS
# ✅ Valid hooks: 63 files
# ⚠️  Files with issues: 4 files  
# 🎯 Success rate: 94.0%
```

##### **`restore`** - Restore from Backups
```bash
# Restore all agent files from .backup files
npx @aigentics/agent-toolkit claude-flow-hooks restore

# Options:
--confirm                 # Skip confirmation prompt

# Examples:
npx @aigentics/agent-toolkit claude-flow-hooks restore
npx @aigentics/agent-toolkit claude-flow-hooks restore --confirm
```

##### **`help-examples`** - Usage Examples and Workflows
```bash
# Show comprehensive usage examples
npx @aigentics/agent-toolkit claude-flow-hooks help-examples
```

---

## 🚀 **COMMON WORKFLOWS**

### **🔍 Initial Setup & Assessment**
```bash
# 1. Check overall agent system health
npx @aigentics/agent-toolkit agent-toolkit analyze

# 2. Validate agent configurations  
npx @aigentics/agent-toolkit agent-toolkit validate -v

# 3. Check hook system status
npx @aigentics/agent-toolkit claude-flow-hooks status

# 4. Get detailed hook validation
npx @aigentics/agent-toolkit claude-flow-hooks validate --verbose
```

### **🔧 Fix Issues Automatically**
```bash
# 1. Fix agent configuration issues
npx @aigentics/agent-toolkit agent-toolkit fix --all

# 2. Fix hook issues automatically
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix

# 3. Apply intelligent context-aware fixes
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix

# 4. Verify all fixes worked
npx @aigentics/agent-toolkit claude-flow-hooks status
```

### **🎯 Interactive Precise Control**
```bash
# 1. Check what needs fixing
npx @aigentics/agent-toolkit claude-flow-hooks validate

# 2. Use interactive mode for precise control
npx @aigentics/agent-toolkit claude-flow-hooks interactive

# 3. Verify results
npx @aigentics/agent-toolkit claude-flow-hooks status
```

### **🆘 Emergency Recovery**
```bash
# 1. Restore from backups if something went wrong
npx @aigentics/agent-toolkit claude-flow-hooks restore --confirm

# 2. Re-validate after restore
npx @aigentics/agent-toolkit claude-flow-hooks validate

# 3. Apply fixes more carefully
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix --dry-run
```

### **🚀 New Agent Development**
```bash
# 1. Create new agent
npx @aigentics/agent-toolkit agent-toolkit create my-new-agent -i

# 2. Validate configuration
npx @aigentics/agent-toolkit agent-toolkit validate my-new-agent

# 3. Check hooks are proper
npx @aigentics/agent-toolkit claude-flow-hooks validate

# 4. Analyze system with new agent
npx @aigentics/agent-toolkit agent-toolkit analyze
```

---

## 🎯 **SPECIALIZED USE CASES**

### **📊 CI/CD Integration**
```yaml
# GitHub Actions workflow
name: Claude Flow Agent Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      # Validate agent configurations
      - name: Validate Agents
        run: npx @aigentics/agent-toolkit agent-toolkit validate -f json
        
      # Validate hook configurations  
      - name: Validate Hooks
        run: npx @aigentics/agent-toolkit claude-flow-hooks validate
        
      # Auto-fix issues (if desired)
      - name: Auto-Fix Issues
        run: npx @aigentics/agent-toolkit claude-flow-hooks auto-fix
```

### **🔧 Development Scripts**
```json
{
  "scripts": {
    "agents:validate": "npx @aigentics/agent-toolkit agent-toolkit validate",
    "agents:fix": "npx @aigentics/agent-toolkit agent-toolkit fix --all",
    "agents:analyze": "npx @aigentics/agent-toolkit agent-toolkit analyze",
    "hooks:status": "npx @aigentics/agent-toolkit claude-flow-hooks status",
    "hooks:validate": "npx @aigentics/agent-toolkit claude-flow-hooks validate",
    "hooks:fix": "npx @aigentics/agent-toolkit claude-flow-hooks auto-fix",
    "hooks:smart-fix": "npx @aigentics/agent-toolkit claude-flow-hooks smart-fix",
    "agents:create": "npx @aigentics/agent-toolkit agent-toolkit create"
  }
}
```

### **🎯 Maintenance Automation**
```bash
#!/bin/bash
# Weekly agent system maintenance script

echo "🔍 Weekly Claude Flow Agent System Maintenance"

# Check system health
npx @aigentics/agent-toolkit claude-flow-hooks status

# Apply any needed fixes
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix

# Generate analysis report
npx @aigentics/agent-toolkit agent-toolkit analyze -o weekly-analysis.txt

# Validate everything is working
npx @aigentics/agent-toolkit agent-toolkit validate

echo "✅ Maintenance complete"
```

---

## 📚 **TROUBLESHOOTING GUIDE**

### **Common Error Solutions**

#### **"No agents found"**
```bash
# Verify you're in correct directory
ls .claude/agents/

# Check directory structure
npx @aigentics/agent-toolkit agent-toolkit config

# Specify custom directory
npx @aigentics/agent-toolkit agent-toolkit validate -d ./path/to/agents
```

#### **"Permission denied"**
```bash
# Check file permissions
ls -la node_modules/.bin/

# Fix permissions
chmod +x node_modules/.bin/*
```

#### **"Command not found"**
```bash
# Ensure package exists
npm view @aigentics/agent-toolkit

# Use full NPX syntax
npx @aigentics/agent-toolkit claude-flow-hooks validate
```

#### **"Hook validation failed"**
```bash
# Check for syntax errors
npx @aigentics/agent-toolkit claude-flow-hooks validate --verbose

# Apply fixes
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix
```

---

## 🎉 **COMPLETE COMMAND SUMMARY**

### **Agent Management Commands** (13 commands)
1. `agent-toolkit validate` - Validate configurations
2. `agent-toolkit fix` - Fix configuration issues
3. `agent-toolkit analyze` - System analysis
4. `agent-toolkit create` - Create new agents
5. `agent-toolkit list-templates` - Show templates
6. `agent-toolkit config` - Show configuration

### **Hook Management Commands** (7 commands)  
1. `claude-flow-hooks validate` - Validate hooks
2. `claude-flow-hooks auto-fix` - Automatic fixes
3. `claude-flow-hooks smart-fix` - Intelligent fixes
4. `claude-flow-hooks interactive` - Guided fixing
5. `claude-flow-hooks status` - Quick health check
6. `claude-flow-hooks restore` - Backup recovery
7. `claude-flow-hooks help-examples` - Usage examples

### **Total: 13 Commands Available via NPX** 🚀

**Each command includes comprehensive help, options, and examples for maximum usability and developer experience.**

---

*Complete command reference for Claude Flow Agent Toolkit v0.0.7*