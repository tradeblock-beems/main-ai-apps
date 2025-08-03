# Tradeblock Deployment Pipeline Strategy

> **CRITICAL**: This document protects you from making deployment mistakes. Read it before any deployment work.

## 🏗️ Architecture Overview

We use a **Two-Repository Strategy** that separates development from deployment:

```
┌─────────────────────────────────────┐    ┌──────────────────────────────┐
│  MONOREPO (Development)             │    │  DEPLOYMENT REPO             │
│  /tradeblock-cursor                 │───▶│  /main-ai-apps              │
│                                     │    │                              │
│  • All project work                 │    │  • Clean deployment code    │
│  • Documentation                    │    │  • Vercel configuration      │
│  • Scripts & analysis               │    │  • Production environment    │
│  • Agent configurations             │    │  • No development artifacts  │
└─────────────────────────────────────┘    └──────────────────────────────┘
                                                        │
                                                        ▼
                                            ┌──────────────────────────────┐
                                            │  VERCEL PRODUCTION           │
                                            │  https://internalops.trade   │
                                            │  block.us                    │
                                            └──────────────────────────────┘
```

## 🚨 Critical Safety Rules

### Rule #1: Never Git Pull Between Repos
**NEVER** run `git pull` in `/tradeblock-cursor` thinking it will update from `/main-ai-apps`. They are completely separate repositories with different remotes.

- ❌ **WRONG**: `cd /tradeblock-cursor && git pull` (thinking it gets main-ai-apps changes)
- ✅ **RIGHT**: Each repo has its own remote and pull source

### Rule #2: Know Which Directory You're In
**ALWAYS** check your current directory before running git commands:

```bash
pwd && git remote -v
```

Expected outputs:
- **Development**: `/Users/AstroLab/Desktop/code-projects/tradeblock-cursor` → `tradeblock-cursor.git`
- **Deployment**: `/Users/AstroLab/Desktop/code-projects/main-ai-apps` → `main-ai-apps.git`

### Rule #3: File Conflicts Prevention
These files can exist in both repos but serve different purposes:
- `vercel.json` - Different configurations for different purposes
- `index.html` - Different content and routing
- `requirements.txt` - Different dependencies
- `.gitignore` - Different exclusion patterns

**Never assume they should be identical.**

## 📋 Development to Deployment Workflow

### Phase 1: Development Work (in /tradeblock-cursor)
```bash
# Using shell functions (recommended)
start_dev project-name description

# This automatically:
# - Takes you to tradeblock-cursor
# - Creates feature/project-name/description branch
# - Shows current status

# 2. Do your development work
# - Build tools, scripts, analysis
# - Update documentation
# - Test functionality locally

# 3. Commit development work
git add .
git commit -m "feat(project): description of changes"

# 4. Push and create PR for development repo
git push origin feature/project-name/description
gh pr create --title "..." --body "..."
```

**Manual alternative (if shell functions not installed):**
```bash
cd /Users/AstroLab/Desktop/code-projects/tradeblock-cursor
git checkout -b feature/project-name/description
# ... continue with development work
```

### Phase 2: Prepare for Deployment (selective migration)
```bash
# Using shell functions (recommended)
start_deploy tool-name deployment-update

# This automatically:
# - Takes you to main-ai-apps
# - Creates feature/tool-name/deployment-update branch
# - Shows current status and reminds you about production-only files

# Copy files safely with diff preview
copy_to_deploy projects/tool/app.py tools/tool/app.py
copy_to_deploy projects/tool/requirements.txt tools/tool/requirements.txt
# ... copy other production-ready files
```

**Manual alternative (if shell functions not installed):**
```bash
cd /Users/AstroLab/Desktop/code-projects/main-ai-apps
git checkout -b feature/tool-name/deployment-update
# Manually copy only production-ready files:
# - Updated tool code (Flask apps, etc.)
# - Required data files  
# - Configuration updates
# - DO NOT copy development artifacts
```

### Phase 3: Deployment Configuration
```bash
# Using shell functions (recommended)
deploy                # Navigate to deployment repo
whereami             # Confirm you're in the right place

# 1. Update vercel.json if needed
# 2. Update environment variables via Vercel dashboard
# 3. Test locally first
test_deploy          # Safe wrapper for vercel dev

# 4. Deploy to production with safety prompts
prod_deploy          # Safe wrapper for vercel --prod
```

**Manual alternative (if shell functions not installed):**
```bash
cd /Users/AstroLab/Desktop/code-projects/main-ai-apps
npx vercel dev
npx vercel --prod
```

### Phase 4: Deploy and Verify
```bash
# 1. Commit deployment changes
git add .
git commit -m "feat(tool): deploy updated functionality"

# 2. Create PR for deployment repo
git push origin feature/tool-name/deployment-update
gh pr create --title "Deploy: ..." --body "..."

# 3. Merge PR (after approval)
gh pr merge --squash --delete-branch

# 4. Verify production
# Visit: https://internalops.tradeblock.us/tools/tool-name/
```

## 🔧 Directory Management Commands

### Complete Shell Functions Setup
We've created comprehensive shell functions that provide safe navigation, workflow management, and error prevention. 

**Quick Setup:**
```bash
# Add to your shell profile (one-time setup)
echo 'source /Users/AstroLab/Desktop/code-projects/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/shell-functions-for-deployment.sh' >> ~/.zshrc
source ~/.zshrc
```

**Available Functions After Setup:**
- `dev` - Navigate to development repo with status display
- `deploy` - Navigate to deployment repo with status display  
- `whereami` - Show current location with detailed context
- `start_dev <project> <description>` - Begin new development work
- `start_deploy <tool> <description>` - Prepare deployment branch
- `copy_to_deploy <source> <dest>` - Safe file migration with diff preview
- `test_deploy` - Test deployment locally
- `prod_deploy` - Deploy to production with safety prompts
- `deploy_status` - Show deployment system status
- `deployment_help` - Show all available commands
- `safe_pull` - Git pull with repository verification

**See the complete functions file for details:**
`knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/shell-functions-for-deployment.sh`

## 📁 File Structure Guidelines

### Development Repo (/tradeblock-cursor)
```
tradeblock-cursor/
├── projects/
│   ├── email-hub/           # Development work
│   ├── email-csv-creation/  # Scripts and analysis
│   └── data-analysis/       # Research and testing
├── knowledge-blocks/        # Documentation
├── basic_capabilities/      # Shared utilities
└── archives/               # Historical work
```

### Deployment Repo (/main-ai-apps)
```
main-ai-apps/
├── tools/
│   ├── email-hub/          # Production Flask app
│   └── [future-tools]/     # Additional tools
├── api/                    # Serverless functions
├── projects/               # Data dependencies only
├── basic_capabilities/     # Production utilities
├── vercel.json            # Deployment configuration
└── index.html            # Landing page
```

## 🚨 Common Mistakes & How to Avoid Them

### Mistake 1: Working in Wrong Directory
**Problem**: Making changes in `/tradeblock-cursor` expecting them to appear in deployment.

**Solution**: Use the `whereami()` function before any work. Development happens in tradeblock-cursor, deployment prep happens in main-ai-apps.

### Mistake 2: Copying Everything
**Problem**: Copying entire project directories without filtering.

**Solution**: Only copy production-ready files. Leave out:
- Development scripts
- Test files
- Large data caches
- Debugging artifacts

### Mistake 3: Conflicting Configuration Files
**Problem**: Overwriting deployment configs with development configs.

**Solution**: 
- Each repo has its own `vercel.json` purpose
- Never blindly copy configuration files
- Always review diffs before committing

### Mistake 4: Environment Variable Confusion
**Problem**: Setting dev environment variables in production.

**Solution**:
- Development: Use `.env` files locally
- Production: Set via Vercel dashboard only
- Never commit secrets to either repo

## 🔄 Synchronization Strategy

### What Gets Synced Between Repos
- ✅ **Production-ready tool code** (Flask apps, APIs)
- ✅ **Required data files** (small JSON, CSV files)
- ✅ **Configuration updates** (when necessary)
- ✅ **Documentation updates** (deployment-related)

### What Stays Separate
- ❌ **Development scripts** (analysis, exploration)
- ❌ **Large data files** (caches, logs)
- ❌ **Agent configurations** (development-specific)
- ❌ **Project documentation** (research, notes)

## 🎯 Quality Checklist

Before any deployment, verify:

- [ ] **Right Directory**: `pwd` shows `/main-ai-apps`
- [ ] **Right Remote**: `git remote -v` shows `main-ai-apps.git`
- [ ] **Clean State**: `git status` shows clean working directory
- [ ] **Local Test**: `npx vercel dev` works correctly
- [ ] **Environment Variables**: All secrets set in Vercel dashboard
- [ ] **File Size**: No files over 100MB (GitHub limit)
- [ ] **Production URL**: `https://internalops.tradeblock.us/tools/[tool]/` works

## 🔐 Security Protocols

### Environment Variables
- **Development**: Use `.env` files (never commit)
- **Production**: Set via Vercel dashboard only
- **Verification**: Test that environment variables load correctly

### Access Control
- **Branch Protection**: Enabled on both repos' main branches
- **PR Reviews**: Required for production changes
- **Deployment Access**: Only deploy from verified, tested code

## 📖 Emergency Procedures

### If You're Lost
1. Run `whereami()` to see current location
2. Check `git status` to see pending changes
3. If unsure, STOP and document what you were trying to do
4. Ask for help rather than guessing

### If Deployment Breaks
1. Check Vercel deployment logs: `npx vercel logs [deployment-url]`
2. Verify environment variables in Vercel dashboard
3. Test locally with `npx vercel dev`
4. Roll back to previous working deployment if needed

### If Repos Get Confused
1. NEVER attempt to sync via git pull between repos
2. Manually identify what needs to be moved
3. Copy files individually with intention
4. Test thoroughly before committing

## 🚀 Success Patterns

### Pattern 1: New Tool Development
1. **Develop** in `/tradeblock-cursor/projects/tool-name/`
2. **Test locally** within development environment
3. **Copy production files** to `/main-ai-apps/tools/tool-name/`
4. **Configure** deployment settings in main-ai-apps
5. **Deploy** via Vercel
6. **Document** the process

### Pattern 2: Tool Updates
1. **Update** tool in development repo
2. **Test** changes locally
3. **Migrate** only changed files to deployment repo
4. **Verify** in deployment repo locally
5. **Deploy** to production
6. **Confirm** production functionality

### Pattern 3: Configuration Changes
1. **Document** the change needed
2. **Update** in deployment repo only
3. **Test** with `npx vercel dev`
4. **Deploy** to production
5. **Update** development docs if needed

## 📚 Reference Commands

### Shell Functions (Recommended Approach)
**Install once, use forever:**
```bash
# Setup (one-time)
echo 'source /Users/AstroLab/Desktop/code-projects/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/shell-functions-for-deployment.sh' >> ~/.zshrc
source ~/.zshrc

# Daily usage examples
dev                                    # Go to development repo
start_dev email-hub add-feature        # Start new development work
copy_to_deploy projects/tool/app.py tools/tool/app.py  # Safe file migration
deploy                                 # Go to deployment repo
test_deploy                           # Test locally
prod_deploy                           # Deploy to production
whereami                              # Check current location
deployment_help                       # Show all commands
```

### Essential Git Commands (Manual Fallback)
```bash
# Check current state
pwd && git remote -v && git status

# Safe development workflow
git checkout -b feature/name/description
git add .
git commit -m "feat(scope): description"
git push origin feature/name/description

# Safe deployment workflow
cd /main-ai-apps
git checkout -b feature/tool/deployment-update
# ... make changes ...
git add .
git commit -m "deploy(tool): production update"
git push origin feature/tool/deployment-update
```

### Essential Vercel Commands
```bash
# Test locally (in /main-ai-apps)
npx vercel dev

# Deploy to production (in /main-ai-apps)
npx vercel --prod

# Check deployment status
npx vercel ls

# View logs
npx vercel logs [deployment-url]
```

---

## 🎯 Key Takeaway

**The golden rule**: Development work happens in `/tradeblock-cursor`. Deployment work happens in `/main-ai-apps`. Never confuse the two, and never try to sync them with git commands. Always manually and intentionally move only what's needed for production.

This two-repo strategy gives you:
- **Clean separation** between development and production
- **Deployment safety** through careful file management
- **Version control** for both development and deployment
- **Rollback capability** if deployments fail

Follow this guide religiously, and you'll never have deployment confusion again.

---

*This document is maintained by @architect and @vercel-debugger. Update it whenever deployment patterns change.* 