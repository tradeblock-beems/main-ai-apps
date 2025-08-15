# Push Automation Acquired Knowledge

This file will capture durable insights, repeatable patterns, key lessons learned, and domain-specific principles discovered during the push automation project.

*Knowledge entries will be added by the scribe agent throughout the project lifecycle.*

---

## **Critical Discovery: Python Module Resolution in Next.js Spawned Processes**

### **Issue Summary**
Python scripts that executed successfully standalone were failing with "exit code 1" when spawned from Next.js API routes, with the cryptic error `ModuleNotFoundError: No module named 'basic_capabilities'`.

### **Root Cause Analysis**
The issue was **NOT** with:
- Python execution in Next.js context ✅
- Process spawning mechanisms ✅  
- Environment variable inheritance ✅
- Node.js/Python integration ✅

The issue **WAS** with:
- **Incorrect Python module path resolution** in spawned processes
- **PYTHONPATH environment variable ineffectiveness** in certain execution contexts
- **Relative path calculation errors** in Python scripts

### **Technical Root Cause**
1. **PYTHONPATH Issues**: Setting `PYTHONPATH` from Node.js environment variables was not reliably working in the spawned Python process context
2. **Path Calculation Error**: Python script was calculating repo root as `os.path.join(os.path.dirname(__file__), "..", "..")` which resolved to `/projects/` instead of the actual project root where `basic_capabilities/` exists
3. **Context Differences**: Working directory and module resolution behaved differently when Python was spawned from Next.js vs. executed standalone

### **Solution Pattern**
1. **Remove PYTHONPATH from Node.js environment** - don't rely on environment variables for Python module path
2. **Use explicit sys.path manipulation in Python scripts** - add repo root directly to `sys.path` at script startup
3. **Correct relative path calculation** - use `os.path.join(os.path.dirname(__file__), "..", "..", "..")` to properly navigate from script location to project root
4. **Add comprehensive debug logging** - implement Python debug shim to capture environment, paths, and import failures

### **Diagnostic Infrastructure Built**
- **Python Debug Shim**: Captures environment variables, working directory, Python version, sys.path at script startup
- **Enhanced Node.js Runner**: Comprehensive stdout/stderr capture with file logging  
- **Minimal Reproducers**: Stepped scripts to isolate import vs execution issues
- **Debug File Artifacts**: All execution details saved to `tmp/` for post-mortem analysis

### **Key Insights**
1. **"Exit code 1" is often a red herring** - the real error is typically in stderr or requires debug instrumentation to capture
2. **Environment variable inheritance is unreliable** for Python module paths in spawned processes
3. **Working directory context differs significantly** between standalone and spawned execution
4. **Systematic debugging beats guesswork** - methodical reproduction and instrumentation revealed the issue quickly
5. **Python imports can fail silently** without proper exception handling and logging

### **Reusable Patterns**
- **Debug Shim Template**: Ready-to-use Python debug logging that can be dropped into any script
- **Enhanced Process Runner**: Node.js spawn wrapper with comprehensive logging and artifact generation
- **Path Resolution Formula**: Reliable pattern for calculating project root from nested script locations
- **Systematic Debugging Checklist**: Step-by-step process for diagnosing spawned process failures

### **Future Prevention**
- Always use explicit `sys.path` manipulation instead of relying on `PYTHONPATH`
- Include debug shims in Python scripts that will be executed from other processes
- Test Python scripts in both standalone and spawned contexts during development
- Implement comprehensive logging for all cross-process execution