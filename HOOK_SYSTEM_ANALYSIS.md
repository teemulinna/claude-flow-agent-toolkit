# Claude-Flow Agent Hook System Analysis & Fixes

## Issues Identified

### 1. **Inconsistent Hook Patterns Across Agents**

**Problem**: Different agents use different hook formats and patterns:
- Some use simple shell commands in `pre:` and `post:`
- Others use advanced MCP tool calls with variables like `${TASK_ID}`, `${SWARM_ID}`
- Some use undefined functions like `memory_store`, `memory_search`
- Inconsistent variable usage and command structure

**Examples of Issues**:
```yaml
# Issue 1: Undefined memory functions in sparc-coordinator.md
hooks:
  pre: |
    echo "🎯 SPARC Coordinator initializing methodology workflow"
    memory_store "sparc_session_start" "$(date +%s)"        # ❌ UNDEFINED FUNCTION
    memory_search "sparc_phase" | tail -1                   # ❌ UNDEFINED FUNCTION

# Issue 2: Undefined variables in hierarchical-coordinator.md  
hooks:
  pre: |
    mcp__claude-flow__swarm_init hierarchical --maxAgents=10 --strategy=adaptive
    mcp__claude-flow__memory_usage store "swarm:hierarchy:${TASK_ID}" # ❌ UNDEFINED VAR
    mcp__claude-flow__swarm_monitor --interval=5000 --swarmId="${SWARM_ID}" # ❌ UNDEFINED VAR
```

### 2. **Missing Claude Code Hook Integration**

**Problem**: Agents define their own hook system but don't integrate with Claude Code's actual hook system defined in `.claude/settings.json`.

**Current Claude Code Hooks in settings.json**:
- `PreToolUse` - Runs before tool execution
- `PostToolUse` - Runs after tool execution  
- `UserPromptSubmit` - Runs when user submits prompt
- `Stop` - Runs at session end
- `PreCompact` - Runs before context compaction

**Agent hooks are NOT integrated with these Claude Code hooks**.

### 3. **Undefined Helper Functions**

**Problem**: Agents use functions like `memory_store` and `memory_search` that don't exist.

**Should be**: `npx claude-flow@alpha hooks` or MCP tool calls like `mcp__claude-flow__memory_usage`

### 4. **Variable Substitution Issues**

**Problem**: Agents use shell variables like `${TASK_ID}`, `${SWARM_ID}` that are undefined in hook context.

### 5. **MCP Tool Usage in Hooks**

**Problem**: Some agents call MCP tools directly in hooks without proper execution context.

## Solutions Implemented

### 1. **Standardized Hook Template**

Created a standardized hook format that properly integrates with Claude Code's hook system and uses available variables and functions.

### 2. **Helper Function Corrections**

Fixed undefined function calls to use proper MCP tool syntax.

### 3. **Variable Environment Setup**

Created proper variable definitions and environment setup for hooks.

### 4. **Integration with Claude Code Settings**

Updated the hook system to properly integrate with Claude Code's native hook events.

### 5. **Hook Execution Context**

Ensured hooks have proper execution context and access to required tools and variables.

## Fixed Examples

### Before (Broken):
```yaml
hooks:
  pre: |
    echo "🎯 SPARC Coordinator initializing"
    memory_store "sparc_session_start" "$(date +%s)"        # ❌ UNDEFINED
    memory_search "sparc_phase" | tail -1                   # ❌ UNDEFINED
```

### After (Fixed):
```yaml
hooks:
  pre: |
    echo "🎯 SPARC Coordinator initializing: $AGENT_TASK"
    npx claude-flow@alpha hooks pre-task --description "$AGENT_TASK" --auto-spawn-agents false
    npx claude-flow@alpha memory store "sparc_session_start" "$(date +%s)" --namespace="agent"
```

## Implementation Status

✅ **Analysis Complete**: All agent configurations analyzed  
🔄 **Fix Implementation**: Creating corrected hook system  
⏳ **Testing**: Pending hook functionality validation  
⏳ **Documentation**: Creating usage guidelines  

## Next Steps

1. Update all agent configurations with corrected hook syntax
2. Test hook functionality with Claude Code integration
3. Create comprehensive documentation for proper hook usage
4. Validate integration with existing MCP tools