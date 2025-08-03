#!/bin/bash

# Shell Functions for Safe Deployment Workflow
# Source this file in your shell profile to get deployment safety functions

# Configuration
DEV_REPO_PATH="/Users/AstroLab/Desktop/code-projects/tradeblock-cursor"
DEPLOY_REPO_PATH="/Users/AstroLab/Desktop/code-projects/main-ai-apps"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Navigation functions
dev() {
    echo -e "${BLUE}Switching to development repository...${NC}"
    cd "$DEV_REPO_PATH"
    echo -e "${GREEN}Now in: $(pwd)${NC}"
    echo -e "${YELLOW}Repository: tradeblock-cursor (development)${NC}"
    git status --short | head -5
}

deploy() {
    echo -e "${BLUE}Switching to deployment repository...${NC}"
    if [ ! -d "$DEPLOY_REPO_PATH" ]; then
        echo -e "${RED}Deployment repository not found: $DEPLOY_REPO_PATH${NC}"
        echo "You may need to clone or create the main-ai-apps repository first."
        return 1
    fi
    cd "$DEPLOY_REPO_PATH"
    echo -e "${GREEN}Now in: $(pwd)${NC}"
    echo -e "${YELLOW}Repository: main-ai-apps (deployment)${NC}"
    git status --short | head -5
}

whereami() {
    local current_dir=$(pwd)
    echo -e "${PURPLE}=== Current Location ===${NC}"
    echo "Directory: $current_dir"
    
    if [[ "$current_dir" == *"tradeblock-cursor"* ]]; then
        echo -e "${GREEN}Repository: tradeblock-cursor (development)${NC}"
        echo "Purpose: Development, documentation, analysis"
        echo "Safe operations: All development work, testing, documentation"
    elif [[ "$current_dir" == *"main-ai-apps"* ]]; then
        echo -e "${YELLOW}Repository: main-ai-apps (deployment)${NC}"
        echo "Purpose: Production deployment, clean code only"
        echo "Safe operations: Production file updates, Vercel deployment"
    else
        echo -e "${RED}Unknown repository location${NC}"
        echo "Recommendation: Use 'dev' or 'deploy' to navigate to known repositories"
    fi
    
    echo ""
    echo "Git status:"
    git status --short | head -5
    
    echo ""
    echo "Recent commits:"
    git log --oneline -3
}

# Workflow functions
start_dev() {
    local project_name="$1"
    local description="$2"
    
    if [ -z "$project_name" ] || [ -z "$description" ]; then
        echo "Usage: start_dev <project-name> <description>"
        echo "Example: start_dev email-hub add-feature"
        return 1
    fi
    
    echo -e "${BLUE}Starting development work...${NC}"
    dev
    
    local branch_name="feature/$project_name/$description"
    echo -e "${YELLOW}Creating branch: $branch_name${NC}"
    
    # Safety check - backup current state
    git stash push -m "auto_backup_$(date +%Y%m%d_%H%M%S)" --include-untracked 2>/dev/null || true
    
    git checkout -b "$branch_name"
    echo -e "${GREEN}Ready for development work on: $branch_name${NC}"
}

start_deploy() {
    local tool_name="$1"
    local description="$2"
    
    if [ -z "$tool_name" ] || [ -z "$description" ]; then
        echo "Usage: start_deploy <tool-name> <description>"
        echo "Example: start_deploy email-hub deployment-update"
        return 1
    fi
    
    echo -e "${BLUE}Starting deployment preparation...${NC}"
    deploy
    
    local branch_name="feature/$tool_name/$description"
    echo -e "${YELLOW}Creating deployment branch: $branch_name${NC}"
    
    # Safety check - backup current state
    git stash push -m "auto_backup_$(date +%Y%m%d_%H%M%S)" --include-untracked 2>/dev/null || true
    
    git checkout -b "$branch_name"
    echo -e "${GREEN}Ready for deployment work on: $branch_name${NC}"
    echo -e "${YELLOW}Remember: Only copy production-ready files here${NC}"
}

# Safe file operations
copy_to_deploy() {
    local source_file="$1"
    local dest_file="$2"
    
    if [ -z "$source_file" ] || [ -z "$dest_file" ]; then
        echo "Usage: copy_to_deploy <source-file> <dest-file>"
        echo "Example: copy_to_deploy projects/email-hub/app.py tools/email-hub/app.py"
        return 1
    fi
    
    # Ensure we're starting from dev repo
    local current_dir=$(pwd)
    if [[ "$current_dir" != *"tradeblock-cursor"* ]]; then
        echo -e "${RED}Error: Must run from development repository${NC}"
        echo "Use 'dev' command first"
        return 1
    fi
    
    local source_path="$DEV_REPO_PATH/$source_file"
    local dest_path="$DEPLOY_REPO_PATH/$dest_file"
    
    if [ ! -f "$source_path" ]; then
        echo -e "${RED}Source file not found: $source_path${NC}"
        return 1
    fi
    
    if [ ! -d "$DEPLOY_REPO_PATH" ]; then
        echo -e "${RED}Deployment repository not found: $DEPLOY_REPO_PATH${NC}"
        return 1
    fi
    
    # Create destination directory if needed
    local dest_dir=$(dirname "$dest_path")
    mkdir -p "$dest_dir"
    
    # Show diff if destination exists
    if [ -f "$dest_path" ]; then
        echo -e "${YELLOW}File exists. Showing differences:${NC}"
        diff "$source_path" "$dest_path" || true
        echo ""
        read -p "Continue with copy? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Copy cancelled"
            return 1
        fi
    fi
    
    # Perform the copy
    cp "$source_path" "$dest_path"
    echo -e "${GREEN}Copied: $source_file -> $dest_file${NC}"
    
    # Show the copied file size and type
    local file_size=$(du -h "$dest_path" | cut -f1)
    echo "File size: $file_size"
}

# Safe Git operations
safe_pull() {
    local current_dir=$(pwd)
    
    echo -e "${BLUE}Safe pull operation...${NC}"
    whereami
    
    echo ""
    read -p "Confirm you want to pull in this repository? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Pull cancelled"
        return 1
    fi
    
    # Backup current state
    git stash push -m "safe_pull_backup_$(date +%Y%m%d_%H%M%S)" --include-untracked 2>/dev/null || true
    
    git pull
    echo -e "${GREEN}Pull completed successfully${NC}"
}

# Deployment functions
test_deploy() {
    echo -e "${BLUE}Testing deployment locally...${NC}"
    
    local current_dir=$(pwd)
    if [[ "$current_dir" != *"main-ai-apps"* ]]; then
        echo -e "${RED}Error: Must be in deployment repository${NC}"
        echo "Use 'deploy' command first"
        return 1
    fi
    
    echo -e "${YELLOW}Starting local Vercel development server...${NC}"
    npx vercel dev
}

prod_deploy() {
    echo -e "${BLUE}Production deployment...${NC}"
    
    local current_dir=$(pwd)
    if [[ "$current_dir" != *"main-ai-apps"* ]]; then
        echo -e "${RED}Error: Must be in deployment repository${NC}"
        echo "Use 'deploy' command first"
        return 1
    fi
    
    echo -e "${RED}WARNING: This will deploy to production!${NC}"
    echo "Current repository: $(pwd)"
    git status --short
    
    echo ""
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        return 1
    fi
    
    echo -e "${YELLOW}Deploying to production...${NC}"
    npx vercel --prod
}

# Information functions
deploy_status() {
    echo -e "${PURPLE}=== Deployment System Status ===${NC}"
    
    echo -e "${BLUE}Development Repository:${NC}"
    if [ -d "$DEV_REPO_PATH" ]; then
        echo "✓ Found: $DEV_REPO_PATH"
        cd "$DEV_REPO_PATH"
        echo "  Branch: $(git branch --show-current)"
        echo "  Status: $(git status --porcelain | wc -l) modified files"
    else
        echo "✗ Not found: $DEV_REPO_PATH"
    fi
    
    echo ""
    echo -e "${BLUE}Deployment Repository:${NC}"
    if [ -d "$DEPLOY_REPO_PATH" ]; then
        echo "✓ Found: $DEPLOY_REPO_PATH"
        cd "$DEPLOY_REPO_PATH"
        echo "  Branch: $(git branch --show-current)"
        echo "  Status: $(git status --porcelain | wc -l) modified files"
        
        if [ -d "tools" ]; then
            local tool_count=$(find tools -maxdepth 1 -type d | wc -l)
            echo "  Tools: $((tool_count - 1)) deployed"
        fi
    else
        echo "✗ Not found: $DEPLOY_REPO_PATH"
    fi
    
    echo ""
    echo -e "${BLUE}Vercel Status:${NC}"
    if command -v vercel &> /dev/null; then
        echo "✓ Vercel CLI installed"
        # Try to get deployment info (may fail if not logged in)
        npx vercel ls 2>/dev/null | head -5 || echo "  (Not logged in or no deployments)"
    else
        echo "✗ Vercel CLI not installed"
    fi
}

deployment_help() {
    echo -e "${PURPLE}=== Deployment Workflow Functions ===${NC}"
    echo ""
    echo -e "${BLUE}Navigation:${NC}"
    echo "  dev                     - Switch to development repository"
    echo "  deploy                  - Switch to deployment repository"
    echo "  whereami                - Show current location and context"
    echo ""
    echo -e "${BLUE}Workflow:${NC}"
    echo "  start_dev <proj> <desc> - Start new development work"
    echo "  start_deploy <tool> <desc> - Prepare deployment branch"
    echo "  copy_to_deploy <src> <dst> - Safe file migration with diff preview"
    echo ""
    echo -e "${BLUE}Safety:${NC}"
    echo "  safe_pull               - Git pull with repository verification"
    echo "  test_deploy             - Test deployment locally"
    echo "  prod_deploy             - Deploy to production with safety prompts"
    echo ""
    echo -e "${BLUE}Information:${NC}"
    echo "  deploy_status           - Show deployment system status"
    echo "  deployment_help         - Show this help (alias: dhelp)"
    echo ""
    echo -e "${YELLOW}Example Workflow:${NC}"
    echo "  dev                                    # Go to development"
    echo "  start_dev email-hub add-feature        # Start new work"
    echo "  # ... do development work ..."
    echo "  deploy                                 # Go to deployment"
    echo "  start_deploy email-hub feature-update # Prepare deployment"
    echo "  copy_to_deploy projects/email-hub/app.py tools/email-hub/app.py"
    echo "  test_deploy                           # Test locally"
    echo "  prod_deploy                           # Deploy to production"
}

# Aliases for convenience
alias dhelp='deployment_help'
alias ds='deploy_status'
alias td='test_deploy'
alias pd='prod_deploy'

# File deletion protection
prevent_file_deletion() {
    echo -e "${RED}CRITICAL SAFETY WARNING${NC}"
    echo "File deletion operations detected during Git operations can cause data loss."
    echo ""
    echo "Safe practices:"
    echo "1. Complete Git operations (cherry-pick, rebase, reset) FIRST"
    echo "2. Handle file cleanup as a SEPARATE step"
    echo "3. Always backup before major operations"
    echo "4. Use the deployment cleanup protocol script"
    echo ""
    echo "If files were accidentally deleted:"
    echo "1. Check git reflog: git reflog"
    echo "2. Check stashes: git stash list"
    echo "3. Restore from commit: git checkout <commit> -- <file>"
    echo ""
    read -p "Press Enter to continue..."
}

# Auto-check function (runs when functions are loaded)
deployment_auto_check() {
    # Only run if in a Git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local current_dir=$(pwd)
        
        # Check for potential issues
        if [[ "$current_dir" == *"tradeblock-cursor"* ]] && [ -d ".vercel" ]; then
            echo -e "${YELLOW}Warning: .vercel directory found in development repo${NC}"
            echo "Consider removing it: rm -rf .vercel"
        fi
        
        # Check for large files in current directory
        local large_files=$(find . -maxdepth 2 -type f -size +50M 2>/dev/null | head -3)
        if [ -n "$large_files" ]; then
            echo -e "${YELLOW}Warning: Large files detected in current directory${NC}"
            echo "Use 'deployment_help' for cleanup guidance"
        fi
    fi
}

# Initialize
echo -e "${GREEN}Deployment workflow functions loaded successfully!${NC}"
echo "Type 'deployment_help' or 'dhelp' for usage information"

# Run auto-check
deployment_auto_check 