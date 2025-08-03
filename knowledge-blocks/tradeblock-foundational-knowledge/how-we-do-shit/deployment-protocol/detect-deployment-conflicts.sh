#!/bin/bash

# Deployment Conflict Detection Script
# Scans for potential conflicts between development and deployment repositories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEV_REPO_PATH="/Users/AstroLab/Desktop/code-projects/tradeblock-cursor"
DEPLOY_REPO_PATH="/Users/AstroLab/Desktop/code-projects/main-ai-apps"

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# Check if repositories exist
check_repos() {
    log "Checking repository paths..."
    
    if [ ! -d "$DEV_REPO_PATH" ]; then
        error "Development repository not found: $DEV_REPO_PATH"
        exit 1
    fi
    
    if [ ! -d "$DEPLOY_REPO_PATH" ]; then
        warn "Deployment repository not found: $DEPLOY_REPO_PATH"
        echo "This is normal if you haven't set up deployment yet."
        return 1
    fi
    
    success "Both repositories found"
    return 0
}

# Check for dangerous files in development repo
check_dangerous_dev_files() {
    header "Checking for Dangerous Files in Development Repo"
    
    cd "$DEV_REPO_PATH"
    
    local issues=0
    
    # Check for deployment-specific directories
    if [ -d "api" ]; then
        warn "Found 'api' directory in development repo"
        echo "  This should only exist in deployment repo"
        ((issues++))
    fi
    
    if [ -d ".vercel" ]; then
        warn "Found '.vercel' directory in development repo"
        echo "  This contains deployment state and should be in deployment repo only"
        ((issues++))
    fi
    
    # Check for multiple vercel.json files
    local vercel_files=$(find . -name "vercel.json" -not -path "./.git/*" | wc -l)
    if [ "$vercel_files" -gt 1 ]; then
        warn "Found multiple vercel.json files in development repo:"
        find . -name "vercel.json" -not -path "./.git/*"
        echo "  Only one should exist per deployment target"
        ((issues++))
    fi
    
    # Check for large files
    local large_files=$(find . -type f -size +50M -not -path "./.git/*" 2>/dev/null)
    if [ -n "$large_files" ]; then
        warn "Found large files (>50MB) in development repo:"
        echo "$large_files" | while read -r file; do
            local size=$(du -h "$file" | cut -f1)
            echo "  $file ($size)"
        done
        ((issues++))
    fi
    
    # Check for backup files
    local backup_files=$(find . -name "*.bak" -o -name "*~" -o -name "*.tmp" 2>/dev/null)
    if [ -n "$backup_files" ]; then
        warn "Found backup files in development repo:"
        echo "$backup_files"
        ((issues++))
    fi
    
    if [ "$issues" -eq 0 ]; then
        success "No dangerous files found in development repo"
    else
        warn "Found $issues potential issues in development repo"
    fi
    
    return "$issues"
}

# Check deployment repo structure
check_deployment_structure() {
    header "Checking Deployment Repository Structure"
    
    if [ ! -d "$DEPLOY_REPO_PATH" ]; then
        warn "Deployment repository not found - skipping structure check"
        return 1
    fi
    
    cd "$DEPLOY_REPO_PATH"
    
    local issues=0
    
    # Check for development artifacts
    if [ -d "projects" ]; then
        warn "Found 'projects' directory in deployment repo"
        echo "  This should only contain production data, not development projects"
        
        # Check size of projects directory
        local projects_size=$(du -sh projects 2>/dev/null | cut -f1)
        echo "  Size: $projects_size"
        ((issues++))
    fi
    
    if [ -d "archives" ]; then
        warn "Found 'archives' directory in deployment repo"
        echo "  Archives should only be in development repo"
        ((issues++))
    fi
    
    if [ -d "knowledge-blocks" ]; then
        warn "Found 'knowledge-blocks' directory in deployment repo"
        echo "  Documentation should only be in development repo"
        ((issues++))
    fi
    
    # Check for required deployment files
    if [ ! -f "vercel.json" ]; then
        error "Missing vercel.json in deployment repo root"
        ((issues++))
    fi
    
    if [ ! -f "index.html" ]; then
        warn "Missing index.html in deployment repo root"
        echo "  Consider adding a landing page"
        ((issues++))
    fi
    
    # Check tools directory structure
    if [ -d "tools" ]; then
        success "Found tools directory"
        local tool_count=$(find tools -maxdepth 1 -type d | wc -l)
        log "Found $((tool_count - 1)) tools in deployment repo"
    else
        warn "No tools directory found in deployment repo"
        ((issues++))
    fi
    
    if [ "$issues" -eq 0 ]; then
        success "Deployment repository structure looks good"
    else
        warn "Found $issues structural issues in deployment repo"
    fi
    
    return "$issues"
}

# Check for configuration conflicts
check_config_conflicts() {
    header "Checking Configuration Conflicts"
    
    if [ ! -d "$DEPLOY_REPO_PATH" ]; then
        warn "Deployment repository not found - skipping config check"
        return 1
    fi
    
    local issues=0
    
    # Compare requirements.txt files
    if [ -f "$DEV_REPO_PATH/requirements.txt" ] && [ -f "$DEPLOY_REPO_PATH/requirements.txt" ]; then
        log "Comparing requirements.txt files..."
        
        if ! diff -q "$DEV_REPO_PATH/requirements.txt" "$DEPLOY_REPO_PATH/requirements.txt" > /dev/null; then
            warn "requirements.txt files differ between repos"
            echo "  This may be intentional, but verify deployment dependencies"
            ((issues++))
        else
            success "requirements.txt files are identical"
        fi
    fi
    
    # Compare .gitignore files
    if [ -f "$DEV_REPO_PATH/.gitignore" ] && [ -f "$DEPLOY_REPO_PATH/.gitignore" ]; then
        log "Comparing .gitignore files..."
        
        if ! diff -q "$DEV_REPO_PATH/.gitignore" "$DEPLOY_REPO_PATH/.gitignore" > /dev/null; then
            log ".gitignore files differ (this is usually correct)"
        fi
    fi
    
    if [ "$issues" -eq 0 ]; then
        success "No critical configuration conflicts found"
    else
        warn "Found $issues configuration conflicts"
    fi
    
    return "$issues"
}

# Check Git status
check_git_status() {
    header "Checking Git Status"
    
    log "Development repository status:"
    cd "$DEV_REPO_PATH"
    git status --short | head -10
    
    if [ -d "$DEPLOY_REPO_PATH" ]; then
        log "Deployment repository status:"
        cd "$DEPLOY_REPO_PATH"
        git status --short | head -10
    fi
}

# Generate cleanup recommendations
generate_recommendations() {
    header "Cleanup Recommendations"
    
    echo "Based on the scan results, here are recommended actions:"
    echo ""
    
    echo "1. Development Repository Cleanup:"
    echo "   - Remove any backup files (*.bak, *.tmp, *~)"
    echo "   - Clean up large files or move them to external storage"
    echo "   - Remove .vercel directory if present"
    echo "   - Ensure only one vercel.json per tool"
    echo ""
    
    echo "2. Deployment Repository Cleanup:"
    echo "   - Remove development artifacts (projects/, archives/, knowledge-blocks/)"
    echo "   - Keep only production-ready code in tools/"
    echo "   - Verify vercel.json is properly configured"
    echo "   - Add index.html landing page if missing"
    echo ""
    
    echo "3. Configuration Sync:"
    echo "   - Review requirements.txt differences"
    echo "   - Ensure environment variables are set in Vercel dashboard"
    echo "   - Verify .gitignore patterns are appropriate for each repo"
    echo ""
    
    echo "4. Automated Cleanup Commands:"
    echo "   # Development repo cleanup"
    echo "   cd $DEV_REPO_PATH"
    echo "   find . -name '*.bak' -delete"
    echo "   find . -name '*.tmp' -delete"
    echo "   find . -name '*~' -delete"
    echo "   rm -rf .vercel/"
    echo ""
    
    if [ -d "$DEPLOY_REPO_PATH" ]; then
        echo "   # Deployment repo cleanup"
        echo "   cd $DEPLOY_REPO_PATH"
        echo "   rm -rf projects/ archives/ knowledge-blocks/"
        echo "   find . -name '*.bak' -delete"
        echo ""
    fi
    
    echo "5. Prevention:"
    echo "   - Use the deployment cleanup protocol script regularly"
    echo "   - Set up pre-commit hooks to prevent large file commits"
    echo "   - Follow the two-repository strategy strictly"
}

# Main function
main() {
    header "Deployment Conflict Detection"
    echo "Scanning for potential deployment conflicts and issues..."
    echo ""
    
    local total_issues=0
    
    # Check if repos exist
    if ! check_repos; then
        warn "Some checks will be skipped due to missing repositories"
    fi
    
    # Run all checks
    check_dangerous_dev_files
    total_issues=$((total_issues + $?))
    
    check_deployment_structure
    total_issues=$((total_issues + $?))
    
    check_config_conflicts
    total_issues=$((total_issues + $?))
    
    check_git_status
    
    echo ""
    generate_recommendations
    
    echo ""
    if [ "$total_issues" -eq 0 ]; then
        success "No critical issues found!"
    else
        warn "Found $total_issues total issues that should be addressed"
    fi
    
    echo ""
    log "Scan completed. Review the recommendations above."
}

# Run the main function
main "$@" 