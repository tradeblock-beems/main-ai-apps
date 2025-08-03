# Deployment Protocol Documentation

This directory contains comprehensive documentation and tools for safe deployment workflows that prevent file deletion and repository corruption issues.

## Quick Start

1. **Install Safety Functions** (1 minute):
   ```bash
   echo 'source /Users/AstroLab/Desktop/code-projects/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/shell-functions-for-deployment.sh' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **Test Installation**:
   ```bash
   deployment_help  # Show available functions
   whereami         # Show current context
   ```

3. **Run Health Check**:
   ```bash
   ./detect-deployment-conflicts.sh
   ```

## Files in This Directory

### Core Documentation

• **`deployment-pipeline-strategy.md`** (396 lines)
  - Complete technical strategy for two-repository deployment
  - Detailed workflow procedures and safety rules
  - Architecture overview and file structure guidelines
  - Common mistakes and how to avoid them

• **`deployment-strategy-summary.md`** (176 lines)  
  - Executive summary of deployment strategy
  - Quick reference for key concepts
  - Setup instructions and success metrics
  - Current issues and immediate action plans

• **`deployment-setup-guide.md`** (300+ lines)
  - Step-by-step setup instructions (5 minutes)
  - Detailed configuration options
  - Troubleshooting guide and emergency procedures
  - Examples and success criteria

• **`deployment-cleanup-guide.md`** (200+ lines)
  - Safe cleanup procedures for repositories
  - File deletion prevention strategies
  - Emergency recovery procedures
  - Best practices and monitoring guidelines

### Interactive Tools

• **`shell-functions-for-deployment.sh`** (400+ lines)
  - Complete set of safety functions for deployment workflow
  - Navigation: `dev`, `deploy`, `whereami`
  - Workflow: `start_dev`, `start_deploy`, `copy_to_deploy`
  - Safety: `safe_pull`, `test_deploy`, `prod_deploy`
  - Information: `deploy_status`, `deployment_help`

• **`detect-deployment-conflicts.sh`** (300+ lines)
  - Automated conflict detection between repositories
  - Scans for dangerous files and configuration issues
  - Provides cleanup recommendations
  - Monitors repository health

• **`deployment-cleanup-protocol.sh`** (250+ lines)
  - Safe cleanup procedures with built-in safeguards
  - Backup creation before any operations
  - Large file detection and removal
  - Emergency restore capabilities

## Key Safety Features

### File Deletion Prevention
- **Never delete files during Git operations** (cherry-pick, rebase, reset)
- Automatic backup creation before major operations
- Recovery procedures for accidentally deleted files
- Conflict detection to prevent dangerous situations

### Repository Separation
- **Development Repository**: `/tradeblock-cursor` - All project work, documentation, analysis
- **Deployment Repository**: `/main-ai-apps` - Clean production code only
- Clear boundaries and safety functions to prevent confusion

### Automated Protection
- Pre-commit hooks for large file detection
- Automatic stashing before risky operations
- Repository verification before Git operations
- Context awareness to prevent wrong-repo mistakes

## Common Use Cases

### Daily Development
```bash
dev                                    # Navigate to development
start_dev email-hub add-feature        # Start new work
# ... do development work ...
git add . && git commit -m "feat: add feature"
```

### Deployment Preparation
```bash
deploy                                 # Navigate to deployment
start_deploy email-hub feature-update # Prepare deployment
copy_to_deploy projects/email-hub/app.py tools/email-hub/app.py
test_deploy                           # Test locally
prod_deploy                           # Deploy to production
```

### Health Monitoring
```bash
deploy_status                         # Check system status
./detect-deployment-conflicts.sh     # Scan for issues
./deployment-cleanup-protocol.sh     # Clean up safely
```

### Emergency Recovery
```bash
git stash list                        # Check backups
git reflog                           # Check recent operations
./deployment-cleanup-protocol.sh restore  # Emergency restore
```

## Primary Ownership: @vercel-debugger

This deployment protocol is owned and maintained by `@vercel-debugger`, who is responsible for all Git operations, deployments, and repository safety procedures. The protocol specifically addresses the file deletion issues that occurred during the repository repair process. The @vercel-debugger agent's rules have been updated to:

1. **Prevent destructive operations during Git history manipulation**
2. **Require explicit approval before any file deletion**
3. **Use the deployment cleanup protocol for safe operations**
4. **Always backup before major Git operations**

## Success Metrics

After implementing this protocol:

- ✅ **Zero accidental file deletions** during Git operations
- ✅ **Clear repository separation** with no cross-contamination
- ✅ **Safe deployment workflows** with automatic backups
- ✅ **Quick recovery procedures** for any issues
- ✅ **Automated conflict detection** to prevent problems

## Maintenance Schedule

### Weekly
- Run `detect-deployment-conflicts.sh`
- Check `deploy_status`
- Clean up backup files

### Monthly  
- Review and update shell functions
- Test emergency recovery procedures
- Update documentation based on new learnings

## Related Documentation

- **`../internalops-deployment-guide.md`** - Specific guide for internal tools deployment
- **`../technical-standard-approaches.md`** - General technical standards
- **`../../what-were-building.md`** - Overall project context

---

**Remember**: This protocol was created in response to the file deletion incident during repository repair. Following these procedures will prevent similar issues in the future and ensure safe, reliable deployments. 