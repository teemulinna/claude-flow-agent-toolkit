# 🚀 Claude Flow Agent Toolkit - NPX Usage Guide

## 📦 NPX Installation & Usage

### **Global Installation (Recommended)**
```bash
# Install globally for easy access
npm install -g @aigentics/agent-toolkit

# Or use directly with npx (no installation needed)
npx @aigentics/agent-toolkit
```

### **📊 Complete Command Inventory (13 Total Commands)**

#### **🔧 Hook Management CLI (7 Commands)**
```bash
# 🔍 Validation & Status
npx @aigentics/agent-toolkit claude-flow-hooks validate     # Comprehensive hook validation
npx @aigentics/agent-toolkit claude-flow-hooks status       # Quick health overview

# 🔧 Automatic Fixing
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix      # Safe automatic fixes
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix     # AI context-aware fixes
npx @aigentics/agent-toolkit claude-flow-hooks interactive   # Guided manual fixing

# 💾 Safety & Recovery
npx @aigentics/agent-toolkit claude-flow-hooks restore       # Restore from backups
npx @aigentics/agent-toolkit claude-flow-hooks help-examples # Usage workflows
```

#### **🤖 Agent Management CLI (6 Commands)**
```bash
# 🔍 Validation & Analysis
npx @aigentics/agent-toolkit agent-toolkit validate         # Validate agent configs
npx @aigentics/agent-toolkit agent-toolkit analyze          # System analysis
npx @aigentics/agent-toolkit agent-toolkit config           # Show configuration

# 🔧 Creation & Fixing
npx @aigentics/agent-toolkit agent-toolkit create           # Create new agents
npx @aigentics/agent-toolkit agent-toolkit fix             # Fix agent issues
npx @aigentics/agent-toolkit agent-toolkit list-templates  # Show templates
```

## 🎯 **Quick Start Workflow**

### **1. Initial Setup & Validation**
```bash
# Check current hook system status
npx @aigentics/agent-toolkit claude-flow-hooks status

# Full validation with details
npx @aigentics/agent-toolkit claude-flow-hooks validate --verbose
```

### **2. Fix Issues Automatically**
```bash
# Apply safe automatic fixes
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix

# Apply intelligent context-aware fixes  
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix
```

### **3. Interactive Guided Fixing**
```bash
# For precise control over changes
npx @aigentics/agent-toolkit claude-flow-hooks interactive
```

### **4. Validation & Status Check**
```bash
# Quick status after fixes
npx @aigentics/agent-toolkit claude-flow-hooks status

# Full re-validation
npx @aigentics/agent-toolkit claude-flow-hooks validate
```

## 📊 **Complete Command Reference (13 Commands Total)**

### **🔧 Hook Management Commands (7 Commands)**

| Command | Options | Description | Primary Use Case |
|---------|---------|-------------|------------------|
| **`validate`** | `-v, --verbose` | Comprehensive hook validation | Initial assessment, post-fix verification |
| **`status`** | | Quick health overview with metrics | Daily/weekly health checks |
| **`auto-fix`** | `--dry-run` | Automatic safe fixes | Bulk fixing of common issues |
| **`smart-fix`** | `--verbose` | AI context-aware intelligent fixes | Complex scenarios needing intelligence |
| **`interactive`** | | Guided fixing with approval workflow | Precise control over each change |
| **`restore`** | `--confirm` | Restore from .backup files | Emergency rollback scenarios |
| **`help-examples`** | | Usage examples and workflows | Learning and quick reference |

### **🤖 Agent Management Commands (6 Commands)**

| Command | Key Options | Description | Primary Use Case |
|---------|-------------|-------------|------------------|
| **`validate`** | `-d, -f json, -o file, -v, [name]` | Validate agent configurations | Quality assurance, CI/CD integration |
| **`fix`** | `--dry-run, --all, --tools-format` | Fix agent configuration issues | Error resolution, maintenance |
| **`analyze`** | `-f json, -o file` | System-wide analysis with insights | Performance optimization, planning |
| **`create`** | `-t type, -i, --template, --tools` | Create new agents from templates | Development workflow, prototyping |
| **`list-templates`** | | Show all available agent templates | Discovery, planning new agents |
| **`config`** | | Show current configuration info | Debugging, environment validation |

## 🛠 **Development Integration**

### **NPM Scripts Integration**
```json
{
  "scripts": {
    "hooks:validate": "npx @aigentics/agent-toolkit claude-flow-hooks validate",
    "hooks:fix": "npx @aigentics/agent-toolkit claude-flow-hooks auto-fix",
    "hooks:status": "npx @aigentics/agent-toolkit claude-flow-hooks status",
    "agents:validate": "npx @aigentics/agent-toolkit agent-toolkit validate",
    "agents:analyze": "npx @aigentics/agent-toolkit agent-toolkit analyze"
  }
}
```

### **CI/CD Integration**
```yaml
# GitHub Actions example
name: Validate Claude Flow Agents
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Validate Agent Hooks
        run: npx @aigentics/agent-toolkit claude-flow-hooks validate
      - name: Validate Agent Configurations  
        run: npx @aigentics/agent-toolkit agent-toolkit validate
```

## 🎯 **Common Use Cases**

### **For New Projects**
```bash
# 1. Set up agent validation
npx @aigentics/agent-toolkit claude-flow-hooks status

# 2. Fix any issues found
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix

# 3. Verify everything works
npx @aigentics/agent-toolkit claude-flow-hooks validate
```

### **For Existing Projects**
```bash
# 1. Comprehensive analysis
npx @aigentics/agent-toolkit agent-toolkit analyze

# 2. Fix hook issues
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix

# 3. Validate improvements
npx @aigentics/agent-toolkit claude-flow-hooks status
```

### **For Maintenance**
```bash
# Regular health check
npx @aigentics/agent-toolkit claude-flow-hooks status

# Emergency rollback if needed
npx @aigentics/agent-toolkit claude-flow-hooks restore --confirm
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **"Command not found"**
```bash
# Ensure package is published
npm view @aigentics/agent-toolkit

# Use full npx path
npx @aigentics/agent-toolkit claude-flow-hooks validate
```

#### **"Permission denied"**
```bash
# Check npm authentication
npm whoami

# Verify file permissions
chmod +x node_modules/.bin/claude-flow-hooks
```

#### **"No agents found"**
```bash
# Verify you're in a Claude Flow project
ls .claude/agents/

# Run from project root directory
cd /path/to/your/claude-flow-project
npx @aigentics/agent-toolkit claude-flow-hooks validate
```

## 🎉 **Benefits of NPX Usage**

### **✅ No Installation Required**
- Use latest version automatically
- No global package management
- Always up-to-date tools

### **✅ Project Isolation**
- Each project uses appropriate version
- No version conflicts
- Clean development environment

### **✅ Easy CI/CD Integration**
- Simple one-line commands
- No setup complexity
- Reliable automation

## 📚 **Documentation & Support**

- **GitHub Repository**: https://github.com/teemulinna/claude-flow-agent-toolkit
- **NPM Package**: https://www.npmjs.com/package/@aigentics/agent-toolkit
- **Issues & Support**: https://github.com/teemulinna/claude-flow-agent-toolkit/issues

---

**Ready to use with NPX! No installation required - just run the commands and start validating your Claude Flow agent hooks.** 🚀