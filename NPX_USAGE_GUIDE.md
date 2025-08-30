# 🚀 Claude Flow Agent Toolkit - NPX Usage Guide

## 📦 NPX Installation & Usage

### **Global Installation (Recommended)**
```bash
# Install globally for easy access
npm install -g @aigentics/agent-toolkit

# Or use directly with npx (no installation needed)
npx @aigentics/agent-toolkit
```

### **Available CLI Commands**

#### **🔧 Hook Management CLI**
```bash
# Comprehensive hook validation and management
npx @aigentics/agent-toolkit claude-flow-hooks --help

# Common hook management workflows:
npx @aigentics/agent-toolkit claude-flow-hooks validate    # Validate all hooks
npx @aigentics/agent-toolkit claude-flow-hooks status      # Quick status overview  
npx @aigentics/agent-toolkit claude-flow-hooks auto-fix    # Automatic safe fixes
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix   # Context-aware fixes
npx @aigentics/agent-toolkit claude-flow-hooks interactive # Guided fixing
npx @aigentics/agent-toolkit claude-flow-hooks restore     # Restore from backups
```

#### **🎯 Agent Management CLI**
```bash
# Full agent system management
npx @aigentics/agent-toolkit agent-toolkit --help

# Agent management workflows:
npx @aigentics/agent-toolkit agent-toolkit validate       # Validate agents
npx @aigentics/agent-toolkit agent-toolkit fix           # Fix agent issues
npx @aigentics/agent-toolkit agent-toolkit analyze       # System analysis
npx @aigentics/agent-toolkit agent-toolkit create        # Create new agents
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

## 📊 **Command Reference**

### **Hook Management Commands**

| Command | Description | Use Case |
|---------|-------------|----------|
| `validate` | Comprehensive hook validation | Initial assessment, post-fix verification |
| `status` | Quick status overview | Regular health checks |
| `auto-fix` | Automatic safe fixes | Bulk fixing of common issues |
| `smart-fix` | Context-aware intelligent fixes | Complex scenarios requiring AI decisions |
| `interactive` | Guided manual fixing | Precise control over changes |
| `restore` | Restore from backups | Emergency rollback |
| `help-examples` | Usage examples and workflows | Learning and reference |

### **Agent Management Commands**

| Command | Description | Use Case |
|---------|-------------|----------|
| `validate [agent]` | Validate agent configurations | Quality assurance |
| `fix [agent]` | Fix agent configuration issues | Error resolution |
| `analyze` | System-wide analysis | Performance optimization |
| `create [name]` | Create new agents | Development workflow |
| `list-templates` | Show available templates | Agent development |

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