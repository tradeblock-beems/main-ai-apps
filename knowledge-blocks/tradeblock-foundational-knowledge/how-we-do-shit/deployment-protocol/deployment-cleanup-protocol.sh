#!/bin/bash

# Deployment Cleanup Protocol Script
# This script provides safe cleanup procedures with built-in safeguards

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Safety check function
safety_check() {
    local operation="$1"
    echo -e "${YELLOW}About to perform: $operation${NC}"
    echo "Current directory: $(pwd)"
    echo "Git status:"
    git status --short
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 1
    fi
}

# Backup current state
backup_state() {
    log "Creating backup of current state..."
    
    # Create stash with timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    git stash push -m "cleanup_backup_$timestamp" --include-untracked
    
    if [ $? -eq 0 ]; then
        success "Backup created as stash: cleanup_backup_$timestamp"
    else
        error "Failed to create backup"
        exit 1
    fi
}

# Check for large files
check_large_files() {
    log "Checking for large files (>50MB)..."
    
    local large_files=$(find . -type f -size +50M 2>/dev/null | grep -v ".git")
    
    if [ -n "$large_files" ]; then
        warn "Large files found:"
        echo "$large_files"
        echo ""
        read -p "Remove large files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$large_files" | while read -r file; do
                if [ -f "$file" ]; then
                    log "Removing large file: $file"
                    rm "$file"
                    echo "$file" >> .gitignore
                fi
            done
        fi
    else
        success "No large files found"
    fi
}

# Clean development artifacts
clean_dev_artifacts() {
    log "Cleaning development artifacts..."
    
    # Python artifacts
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Node.js artifacts
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Backup files
    find . -name "*.bak" -delete 2>/dev/null || true
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name "*~" -delete 2>/dev/null || true
    
    # Log files
    find . -name "*.log" -delete 2>/dev/null || true
    
    success "Development artifacts cleaned"
}

# Clean git artifacts
clean_git_artifacts() {
    log "Cleaning Git artifacts..."
    
    # Remove untracked files (with confirmation)
    local untracked=$(git ls-files --others --exclude-standard)
    if [ -n "$untracked" ]; then
        warn "Untracked files found:"
        echo "$untracked"
        echo ""
        read -p "Remove untracked files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git clean -f
            success "Untracked files removed"
        fi
    else
        success "No untracked files to clean"
    fi
    
    # Git garbage collection
    log "Running Git garbage collection..."
    git gc --aggressive --prune=now
    success "Git garbage collection completed"
}

# Verify repository health
verify_repo_health() {
    log "Verifying repository health..."
    
    # Check for corruption
    git fsck --full --strict
    
    if [ $? -eq 0 ]; then
        success "Repository health check passed"
    else
        error "Repository health check failed"
        exit 1
    fi
    
    # Show repository size
    local repo_size=$(du -sh .git | cut -f1)
    log "Repository size: $repo_size"
}

# Main cleanup function
main_cleanup() {
    log "Starting deployment cleanup protocol..."
    
    # Verify we're in a Git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a Git repository"
        exit 1
    fi
    
    # Safety check
    safety_check "Full deployment cleanup"
    
    # Create backup
    backup_state
    
    # Perform cleanup steps
    check_large_files
    clean_dev_artifacts
    clean_git_artifacts
    verify_repo_health
    
    success "Deployment cleanup completed successfully"
    
    # Show final status
    log "Final repository status:"
    git status
}

# Emergency restore function
emergency_restore() {
    log "Starting emergency restore..."
    
    # Show available stashes
    echo "Available backups (stashes):"
    git stash list | grep "cleanup_backup"
    
    echo ""
    read -p "Enter stash number to restore (e.g., 0): " stash_num
    
    if [[ $stash_num =~ ^[0-9]+$ ]]; then
        git stash pop stash@{$stash_num}
        success "Restore completed"
    else
        error "Invalid stash number"
        exit 1
    fi
}

# Usage function
usage() {
    echo "Deployment Cleanup Protocol Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  cleanup     Perform full cleanup (default)"
    echo "  restore     Emergency restore from backup"
    echo "  check       Check repository health only"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full cleanup"
    echo "  $0 cleanup           # Full cleanup"
    echo "  $0 restore           # Emergency restore"
    echo "  $0 check             # Health check only"
}

# Main script logic
case "${1:-cleanup}" in
    "cleanup")
        main_cleanup
        ;;
    "restore")
        emergency_restore
        ;;
    "check")
        verify_repo_health
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
esac 