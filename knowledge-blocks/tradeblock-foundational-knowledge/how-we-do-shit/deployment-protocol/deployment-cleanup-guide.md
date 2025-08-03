# Deployment Cleanup Guide

## Overview

This guide provides safe procedures for cleaning up deployment artifacts, managing repository hygiene, and preventing accidental file deletion during Git operations.

## Critical Safety Rules

### Rule #1: Never Delete Files During Git History Manipulation
- **NEVER** delete files during cherry-pick, rebase, or reset operations
- Always complete Git operations first, then handle file cleanup separately
- If files are missing after Git operations, restore them before proceeding

### Rule #2: Backup Before Cleanup
- Always create backups of important files before cleanup operations
- Use `git stash` or create backup branches before major changes
- Document what you're cleaning up and why

### Rule #3: Verify File Dependencies
- Check if files are referenced in other parts of the codebase
- Use `grep -r "filename" .` to find references
- Update all references before deleting files

## Safe Cleanup Procedures

### 1. Repository Cleanup
```bash
# Check repository status first
git status
git log --oneline -10

# Backup current state
git stash push -m "backup before cleanup"

# Clean untracked files (with confirmation)
git clean -i

# Remove only specific patterns
git clean -f "*.bak"
git clean -f "*.tmp"
```

### 2. Large File Cleanup
```bash
# Find large files
find . -type f -size +50M | head -10

# Check Git history for large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort --numeric-sort --key=2 | tail -10

# Remove large files safely
git rm --cached path/to/large/file
echo "path/to/large/file" >> .gitignore
git commit -m "remove large file from tracking"
```

### 3. Development Artifact Cleanup
```bash
# Remove common development artifacts
rm -f *.bak
rm -f *.tmp
rm -f *.log
rm -rf __pycache__/
rm -rf .pytest_cache/
rm -rf node_modules/

# Clean Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +
```

## Emergency Recovery Procedures

### If Files Were Accidentally Deleted

1. **Check Git History**
```bash
# Find when file was last present
git log --follow --name-status -- path/to/file

# Restore from specific commit
git checkout <commit-hash> -- path/to/file
```

2. **Check Stash**
```bash
# List stashes
git stash list

# Restore from stash
git stash pop
```

3. **Check Reflog**
```bash
# Show recent Git operations
git reflog

# Restore to previous state
git reset --hard HEAD@{n}
```

### If Repository is Corrupted

1. **Create Clean Copy**
```bash
# Clone fresh copy
git clone <repository-url> clean-copy
cd clean-copy

# Manually restore missing files
# Copy files from backup or recreate them
```

2. **Selective Cherry-Pick**
```bash
# Cherry-pick only clean commits
git cherry-pick <good-commit-hash>

# Skip problematic commits
git cherry-pick --skip
```

## Prevention Strategies

### 1. Pre-Operation Checklist
- [ ] Backup current state
- [ ] Document intended changes
- [ ] Verify file dependencies
- [ ] Test in separate branch first

### 2. Git Operation Safety
- [ ] Use `--dry-run` flags when available
- [ ] Review changes with `git diff` before committing
- [ ] Use `git add -p` for selective staging
- [ ] Create feature branches for experimental work

### 3. Automated Protection
```bash
# Add to .gitignore
*.bak
*.tmp
*.log
__pycache__/
.pytest_cache/
node_modules/
.env

# Pre-commit hooks for file size limits
# (Add to .git/hooks/pre-commit)
#!/bin/bash
for file in $(git diff --cached --name-only); do
    if [ -f "$file" ] && [ $(stat -f%z "$file") -gt 104857600 ]; then
        echo "Error: $file is larger than 100MB"
        exit 1
    fi
done
```

## Monitoring and Maintenance

### Weekly Cleanup
```bash
# Check repository health
git fsck --full
git gc --aggressive

# Review large files
find . -type f -size +10M

# Clean development artifacts
make clean  # or your project's cleanup command
```

### Monthly Review
- Review .gitignore effectiveness
- Check for abandoned branches
- Verify backup procedures
- Update cleanup scripts

## Best Practices

1. **Separate Development and Deployment Cleanup**
   - Development repo: Keep all project files, clean only artifacts
   - Deployment repo: Remove all non-production files

2. **Use Automation**
   - CI/CD cleanup jobs
   - Pre-commit hooks
   - Automated backup scripts

3. **Document Everything**
   - What was cleaned and why
   - How to restore if needed
   - Dependencies that were checked

4. **Test Recovery Procedures**
   - Regularly test backup restoration
   - Practice emergency recovery
   - Verify cleanup scripts work correctly

---

**Remember**: It's better to be overly cautious with file deletion than to lose important work. When in doubt, backup first and ask for help. 