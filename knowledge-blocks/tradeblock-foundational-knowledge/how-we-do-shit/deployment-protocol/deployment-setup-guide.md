# Deployment Setup Guide

## Quick Start (5 Minutes)

This guide gets you set up with safe deployment workflows that prevent accidental file deletion and repository corruption.

### 1. Install Shell Functions (1 minute)

Add the deployment safety functions to your shell:

```bash
# Add to your shell profile (one-time setup)
echo 'source /Users/AstroLab/Desktop/code-projects/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/shell-functions-for-deployment.sh' >> ~/.zshrc
source ~/.zshrc
```

**Verify installation:**
```bash
deployment_help  # Should show available functions
whereami         # Should show current repository context
```

### 2. Test Navigation (1 minute)

```bash
dev      # Go to development repository
deploy   # Go to deployment repository (may not exist yet)
whereami # Show current location and status
```

### 3. Run Conflict Detection (2 minutes)

```bash
dev  # Make sure you're in development repo
./knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/detect-deployment-conflicts.sh
```

This will scan for potential issues and provide cleanup recommendations.

### 4. Set Up Deployment Repository (1 minute)

If you don't have a deployment repository yet:

```bash
cd /Users/AstroLab/Desktop/code-projects/
git clone [your-deployment-repo-url] main-ai-apps
# OR create new repository:
mkdir main-ai-apps && cd main-ai-apps && git init
```

## Detailed Setup

### Shell Functions Overview

Once installed, you get these safety functions:

**Navigation:**
- `dev` - Switch to development repository with status
- `deploy` - Switch to deployment repository with status  
- `whereami` - Show current location with detailed context

**Workflow:**
- `start_dev <project> <description>` - Begin new development work
- `start_deploy <tool> <description>` - Prepare deployment branch
- `copy_to_deploy <source> <dest>` - Safe file migration with diff preview

**Safety:**
- `safe_pull` - Git pull with repository verification
- `test_deploy` - Test deployment locally
- `prod_deploy` - Deploy to production with safety prompts

**Information:**
- `deploy_status` - Show deployment system status
- `deployment_help` - Show all available commands

### Repository Structure Setup

**Development Repository** (`/tradeblock-cursor`):
```
tradeblock-cursor/
├── projects/           # All development work
├── knowledge-blocks/   # Documentation
├── basic_capabilities/ # Shared utilities
└── archives/          # Historical work
```

**Deployment Repository** (`/main-ai-apps`):
```
main-ai-apps/
├── tools/             # Production applications
├── api/               # Serverless functions
├── vercel.json       # Deployment configuration
└── index.html        # Landing page
```

### Safety Protocols

#### 1. File Deletion Prevention

**Critical Rules:**
- Never delete files during Git operations (cherry-pick, rebase, reset)
- Always complete Git operations first, then handle cleanup separately
- Use the cleanup protocol script for safe file removal

**If files are accidentally deleted:**
```bash
# Check Git history
git log --follow --name-status -- path/to/file

# Restore from specific commit
git checkout <commit-hash> -- path/to/file

# Check stashes
git stash list
git stash pop stash@{n}

# Check reflog
git reflog
git reset --hard HEAD@{n}
```

#### 2. Backup Strategy

All functions automatically create backups before major operations:

```bash
# Manual backup before risky operations
git stash push -m "backup_$(date +%Y%m%d_%H%M%S)" --include-untracked

# List backups
git stash list

# Restore backup
git stash pop stash@{n}
```

#### 3. Large File Protection

Prevent GitHub's 100MB limit issues:

```bash
# Check for large files
find . -type f -size +50M | head -10

# Add pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
for file in $(git diff --cached --name-only); do
    if [ -f "$file" ] && [ $(stat -f%z "$file") -gt 104857600 ]; then
        echo "Error: $file is larger than 100MB"
        exit 1
    fi
done
EOF
chmod +x .git/hooks/pre-commit
```

### Deployment Workflow

#### Example: Deploy New Feature

```bash
# 1. Development work
dev
start_dev email-hub add-dashboard
# ... do development work ...
git add .
git commit -m "feat: add dashboard feature"

# 2. Prepare deployment
deploy
start_deploy email-hub dashboard-feature
copy_to_deploy projects/email-hub/app.py tools/email-hub/app.py
copy_to_deploy projects/email-hub/templates/dashboard.html tools/email-hub/templates/dashboard.html

# 3. Test and deploy
test_deploy  # Test locally first
git add .
git commit -m "deploy: add dashboard feature"
prod_deploy  # Deploy to production
```

### Troubleshooting

#### Common Issues

1. **"Repository not found" errors**
   ```bash
   # Check paths in shell functions
   echo $DEV_REPO_PATH
   echo $DEPLOY_REPO_PATH
   # Edit the shell functions file if paths are wrong
   ```

2. **Functions not available**
   ```bash
   # Re-source the functions
   source ~/.zshrc
   # Or reload manually
   source /Users/AstroLab/Desktop/code-projects/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/shell-functions-for-deployment.sh
   ```

3. **Git conflicts during deployment**
   ```bash
   # Always backup first
   git stash push -m "conflict_backup" --include-untracked
   # Resolve conflicts manually
   # Use git status to see what needs attention
   ```

4. **Accidentally deleted files**
   ```bash
   # Run the conflict detection script
   ./knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/detect-deployment-conflicts.sh
   # Follow the recovery procedures in the output
   ```

#### Emergency Recovery

If something goes wrong:

1. **Stop immediately** - Don't try to fix with more Git commands
2. **Document what happened** - Write down what you were doing
3. **Check backups** - `git stash list` and `git reflog`
4. **Use recovery tools** - The cleanup protocol script has emergency restore
5. **Ask for help** - Better to get assistance than make it worse

### Advanced Configuration

#### Custom Repository Paths

Edit the shell functions file to use different paths:

```bash
# Edit this file:
vim knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/shell-functions-for-deployment.sh

# Change these variables:
DEV_REPO_PATH="/your/custom/dev/path"
DEPLOY_REPO_PATH="/your/custom/deploy/path"
```

#### Additional Safety Checks

Add custom checks to the auto-check function:

```bash
# Add to deployment_auto_check() in shell functions file
if [ -f "dangerous-file.txt" ]; then
    warn "Dangerous file detected"
fi
```

### Maintenance

#### Weekly Tasks

```bash
# Check repository health
dev
./knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/detect-deployment-conflicts.sh

# Clean up development artifacts
./knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/deployment-cleanup-protocol.sh

# Check deployment status
deploy_status
```

#### Monthly Tasks

- Review and update shell functions
- Test emergency recovery procedures
- Update .gitignore patterns
- Review large file accumulation

---

## Success Criteria

After setup, you should be able to:

- [ ] Navigate safely between repositories with `dev` and `deploy`
- [ ] Know your current context with `whereami`
- [ ] Start new work safely with `start_dev` and `start_deploy`
- [ ] Copy files safely with `copy_to_deploy`
- [ ] Test deployments with `test_deploy`
- [ ] Deploy to production safely with `prod_deploy`
- [ ] Get help anytime with `deployment_help`
- [ ] Recover from accidents using backup procedures

**Remember**: These tools are designed to prevent the file deletion issues that occurred during repository repair. Use them consistently and you'll avoid similar problems in the future. 