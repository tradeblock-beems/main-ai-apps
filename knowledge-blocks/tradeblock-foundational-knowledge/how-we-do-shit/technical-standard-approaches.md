# Tradeblock Technical Standards & Approaches

This document is the canonical source for our team's standardized technical practices. Its purpose is to create consistency, predictability, and reusability across all projects. Adhering to these standards is mandatory to ensure our systems are scalable, secure, and maintainable.

---

### **Standard #1: Connecting to External Services & APIs**


**1. Principle (The "Why")**

To ensure all connections to external services (databases, third-party APIs, etc.) are secure, consistent, and easily manageable across different environments (local, staging, production), we will centralize all credentials and endpoints into environment variables. This practice strictly separates configuration from code, a core principle of the [Twelve-Factor App](https://12factor.net/config) methodology.


**2. The Standard (The "How")**

This is the non-negotiable process for managing and accessing external service credentials.

-   **A. Secret Storage**: All secrets, API keys, and environment-specific configurations **MUST** be stored in a `.env` file located at the project root for local development. This file **MUST NEVER** be committed to version control.

-   **B. Version Control Exclusion**: The `.env` file **MUST** be explicitly listed in the project's root `.gitignore` file to prevent accidental commits.

-   **C. Configuration Loading (Python)**: For Python-based applications, a central script, `config.py`, is responsible for loading these environment variables from the `.env` file into the application at runtime. The `python-dotenv` library is our standard tool for this task.

-   **D. Configuration Loading (Node.js/Next.js)**: For Node.js-based applications, especially Next.js, two standard methods are acceptable:
    -   **`.env.local` File**: The preferred method is to create a `.env.local` file at the root of the specific application (e.g., `apps/my-app/.env.local`). Next.js automatically loads this file into the application's environment. This file **MUST** be included in the root `.gitignore`.
    -   **`dotenv-cli`**: As an alternative, particularly for solo-developer projects or when sharing a root `.env` file across multiple applications in a monorepo, the `dotenv-cli` package can be used. The `dev` script in `package.json` should be modified to use `dotenv -e ../../.env -- next dev`. This loads the variables from the root `.env` file before starting the Next.js development server.

-   **E. Utility Modules**: For each type of external service (e.g., SQL, GraphQL), a dedicated utility module (e.g., `sql_utils.py`, `db.ts`) **MUST** be created. These modules are responsible for importing the necessary configuration (either directly from `process.env` in Node.js or from `config.py` in Python) and providing simple, reusable functions for interacting with the service (e.g., `get_db_connection()`, `execute_graphql_query()`).

-   **F. Directory Structure**: All configuration and utility modules will be organized under a `/basic_capabilities` or `/src/lib` directory, depending on the framework. This signifies their foundational, reusable nature.


**3. Reference Implementation**

The `tradeblock-cursor` and `main-ai-apps` projects serve as the reference implementations for these standards.

-   **Python Reference (`tradeblock-cursor`)**:
    -   **Secret File**: `/.env`
    -   **Configuration Loader**: `/basic_capabilities/internal_db_queries_toolbox/config.py`
    -   **Utility Modules**: `/basic_capabilities/internal_db_queries_toolbox/sql_utils.py`

-   **Node.js/Next.js Reference (`main-ai-apps`)**:
    -   **Secret File**: `/.env` (at the monorepo root)
    -   **Configuration Loader**: `dotenv-cli` used in `apps/push-blaster/package.json`
    -   **Utility Module**: `apps/push-blaster/src/lib/db.ts`


**4. How to Use This Standard in a New Project**

-   **For Python**: Follow the steps outlined in the original documentation.
-   **For Node.js/Next.js**:
    1. Ensure a root `.env` file exists and is git-ignored.
    2. Choose your environment variable strategy: a dedicated `.env.local` within your app, or `dotenv-cli` pointing to the root `.env`.
    3. Create a library module (e.g., `/src/lib/db.ts`) to manage your database connection or external service clients, pulling configuration from `process.env`.

---

### **Standard #2: Git Workflow & Commit Strategy**

**1. Principle (The "Why")**

To maintain a clean, understandable version history and ensure the `main` branch is always stable and deployable, we will use a feature branch workflow. All changes are developed in isolation on a dedicated branch before being integrated into the main codebase. This prevents broken code from being merged and allows for easy review of new changes.

**2. The Standard (The "How")**

This is the required process for all code changes committed to our repositories.

-   **A. Main Branch Protection**: The `main` branch is the source of truth and is considered sacred. Direct commits or pushes to the `main` branch are **STRICTLY FORBIDDEN**.

-   **B. Phase-Based Feature Branches**: All new work **MUST** be done on a dedicated feature branch. In our workflow, each major "feature" corresponds to a single **Phase** of a project's Execution Checklist.
    -   Before starting a new phase, a branch for that phase must be created from the latest version of `main`.
    -   `git checkout main`
    -   `git pull origin main`
    -   `git checkout -b [branch-name]`

-   **C. Branch Naming Convention**: Branches for project phases **MUST** be named using the following format: `feature/[project-name]/phase-[number]-[short-description]`.
    -   *Example:* `feature/internalops-deployment/phase-1-API-access-setup`
    -   For small, standalone fixes or chores not associated with a project phase, the `fix/[short-description]` or `chore/[short-description]` convention may be used.
    -   *Example:* `fix/typo-in-readme`

-   **D. Atomic & Incremental Commits**: Commits should be small, logical, and "atomic"—representing a single, complete unit of work. Make frequent, incremental commits rather than large, infrequent ones.

-   **E. Commit Message Format**: All commit messages **MUST** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This creates a clean, machine-readable history.
    -   **Format**: `type(scope): subject`
    -   **Common Types**:
        -   `feat`: A new feature for the user.
        -   `fix`: A bug fix for the user.
        -   `chore`: Routine tasks, build process changes, etc. (no production code change).
        -   `docs`: Changes to documentation only.
        -   `refactor`: A code change that neither fixes a bug nor adds a feature.
        -   `style`: Code style changes (formatting, etc.) that don't affect logic.
    -   *Example Commit:* `feat(auth): implement password reset functionality`

-   **F. Merging via Pull Request**: All code **MUST** be merged into `main` via a GitHub Pull Request (PR). Direct pushes are forbidden.
    -   **PR Lifecycle Management**: The `@vercel-debugger` agent will manage the PR lifecycle using the GitHub CLI (`gh`). This includes creating the PR, requesting reviews, and performing the final merge.
    -   **User Approval for Merge**: Before merging, the `@vercel-debugger` **MUST** provide the user with the PR link and a summary of the changes, then await explicit approval (e.g., "good to merge," "ship it") in the chat. This replaces manual UI approval while maintaining a human checkpoint.
    -   **Merge Strategy**: The default merge strategy will be "Squash and Merge" to maintain a clean, linear history on the `main` branch. This will be executed via `gh pr merge --squash`.

-   **G. Branch Cleanup**: After a feature branch has been successfully merged into `main`, it **MUST** be deleted from the remote repository. This practice, known as branch hygiene, reduces clutter and prevents accidental commits to stale branches.
    -   GitHub provides a "Delete branch" button in the Pull Request interface immediately after merging. This is the preferred method.
    -   Alternatively, the branch can be deleted from the command line: `git push origin --delete [branch-name]`

-   **H. Agent Responsibility**: The `@vercel-debugger` agent is solely responsible for executing all Git commands related to branching, committing, merging, and pushing, including management of the PR lifecycle as defined in section (F). The `@squad-agent-conductor` will direct the vercel-debugger on *when* to perform these actions according to the project checklist, but will not execute the git commands directly. This centralization of execution ensures that all repository interactions are handled by a Git and deployment expert, minimizing risk.

-   **I. Safety Protocols**: Before risky Git operations (force pushes, history rewrites, large merges with conflicts), `@vercel-debugger` **MUST**:
    -   Create backup using: `git stash push -m "backup_$(date +%Y%m%d_%H%M%S)" --include-untracked`
    -   Verify repository context using deployment protocol `whereami` function when available
    -   Get explicit user approval for force pushes and potentially risky merges
    -   Use deployment protocol safety functions for repository health checks

-   **J. Error Handling Protocol**: If any Git command results in an error, the agent executing the command **MUST STOP** immediately. Do not attempt to "fix" the issue with further commands. The full command and its exact error output must be reported to the user and the `@vercel-debugger` for diagnosis. This prevents a small error from escalating into data loss.

**3. Reference Implementation**

The branch `feature/deploy-email-hub` serves as an example of our phase-based branching strategy. Future branches will adhere to the `feature/[project-name]/phase-[number]` convention.

---

### **Standard #3: Troubleshooting Push Failures & Multi-Account Setups**

**1. Principle (The "Why")**

When pushing to GitHub, failures can occur for reasons that are not immediately obvious from the error message. A common scenario is having credentials for multiple GitHub accounts on a single machine. To ensure we can diagnose and resolve these issues quickly and prevent them from happening again, we will follow a standard diagnostic procedure.

**2. The Standard (The "How")**

This is the required process for troubleshooting push failures, particularly when authentication issues are suspected.

-   **A. "Repository Not Found" is an Authentication Error**: The `fatal: repository not found` error from GitHub is often a security measure. If you are certain the URL is correct, it almost always means the credentials Git is using belong to a user who does not have access to that repository. **Do not waste time debugging the URL.**

-   **B. Forcing the Correct User Context**: When multiple GitHub accounts are in use, the best practice is to explicitly tell Git which user to authenticate as for a specific repository. This overrides any incorrect credentials cached in the macOS Keychain.
    -   **Command**: `git remote set-url origin https://USERNAME@github.com/ORG/REPO.git`
    -   *Example*: `git remote set-url origin https://tradeblock-beems@github.com/tradeblock-beems/tradeblock-cursor.git`
    -   After running this command, the next `git push` will force an authentication prompt for the specified user. You should use a valid Personal Access Token (PAT) as the password.

-   **C. Diagnosing Environment Interference**: Integrated terminals (like in VS Code or Cursor) can sometimes set environment variables that interfere with Git's standard authentication flow.
    -   The `GIT_ASKPASS` variable is a common culprit. You can check for it with `env | grep GIT`.
    -   To bypass this for a single command and force a standard prompt, unset the variable for that command only: `GIT_ASKPASS='' git push ...`

-   **D. Resolving RPC/HTTP 400 Errors**: If you successfully authenticate but the push fails with an error like `error: RPC failed; HTTP 400` or `the remote end hung up unexpectedly`, it often indicates a data transfer issue.
    -   The standard fix is to increase Git's HTTP post buffer size.
    -   **Command**: `git config http.postBuffer 524288000`
    -   This command only needs to be run once per repository.

---

### **Standard #4: Internal Operations Deployment Workflow**

**1. Principle (The "Why")**

To ensure all internal tools and applications are deployed consistently and securely to the `internalops.tradeblock.us` domain, we will use a standardized deployment workflow that supports our AI-first operational strategy. This centralized approach provides unified access to administrative interfaces, analytics dashboards, and automation tools while maintaining proper security and infrastructure management.

**2. The Standard (The "How")**

This is the required process for deploying internal tools to the internal operations platform.

-   **A. Repository Structure**: All internal tools **MUST** be deployed from the `main-ai-apps` repository using the standardized directory structure.
    -   **Main Repository**: `main-ai-apps` (GitHub)
    -   **Tool Organization**: Each tool lives in `/tools/[tool-name]/` directory
    -   **Shared Resources**: Common assets, utilities, and configurations in `/shared/`
    -   **Documentation**: Deployment documentation in `/docs/`

-   **B. Domain Architecture**: All internal tools **MUST** be deployed to subpaths of the `internalops.tradeblock.us` domain.
    -   **Domain Pattern**: `https://internalops.tradeblock.us/tools/[tool-name]`
    -   **Landing Page**: `https://internalops.tradeblock.us/` serves as the main navigation hub
    -   **SSL/HTTPS**: All traffic **MUST** be served over HTTPS with automatic SSL certificate management

-   **C. Deployment Platform**: Vercel is the standardized deployment platform for internal tools.
    -   **Framework**: Flask (Python 3.11) with serverless function deployment
    -   **Configuration**: Root-level `vercel.json` with multi-tool routing support
    -   **Environment Management**: All secrets stored in Vercel environment variables
    -   **Build Process**: Automatic dependency installation via `requirements.txt`

-   **D. Tool Configuration Requirements**: Each tool **MUST** be configured for subpath deployment.
    -   **Flask Configuration**: Path-aware routing with `APPLICATION_ROOT` configuration
    -   **Template Updates**: All templates use subpath-aware URLs via template variables
    -   **Static File Handling**: Proper static file serving for subpath deployment
    -   **API Routes**: All API endpoints configured for subpath operation

-   **E. Security Standards**: All internal tools **MUST** implement production-ready security measures.
    -   **Input Validation**: Comprehensive validation and sanitization of all inputs
    -   **Environment Variables**: All secrets managed via environment variables
    -   **Rate Limiting**: API endpoints protected with appropriate rate limiting
    -   **Error Handling**: Secure error responses that don't leak sensitive information
    -   **HTTPS Enforcement**: All traffic redirected to HTTPS

-   **F. Monitoring & Health Checks**: All tools **MUST** implement standardized monitoring.
    -   **Health Endpoint**: Each tool provides a `/health` endpoint for monitoring
    -   **Structured Logging**: Application logs use consistent formatting
    -   **Performance Metrics**: Request/response time tracking implemented
    -   **Error Tracking**: Comprehensive error logging and alerting

-   **G. Development to Production Workflow**: Tools are developed in project-specific repositories then migrated to production.
    -   **Development**: Tools developed in `tradeblock-cursor/projects/[tool-name]/`
    -   **Migration**: Tools copied to `main-ai-apps/tools/[tool-name]/` for production
    -   **Configuration**: Tools updated for subpath deployment during migration
    -   **Testing**: Full functionality verification before production deployment

-   **H. Deployment Process**: The `@vercel-debugger` agent manages the deployment lifecycle.
    -   **Repository Management**: `@vercel-debugger` handles `main-ai-apps` repository operations using deployment protocol safety tools
    -   **Vercel Configuration**: `@vercel-debugger` configures Vercel projects and domains
    -   **Environment Variables**: `@vercel-debugger` manages production environment configuration
    -   **Deployment Validation**: `@vercel-debugger` validates deployments before go-live
    -   **Safety Requirements**: Must use deployment protocol tools for conflict detection and repository health checks before deployment

**3. Reference Implementation**

The Email Hub tool serves as the reference implementation for this standard.

-   **Development Location**: `/tradeblock-cursor/projects/email-hub/`
-   **Production Location**: `/main-ai-apps/tools/email-hub/`
-   **Production URL**: `https://internalops.tradeblock.us/tools/email-hub`
-   **Architecture**: Flask app with subpath routing, secure API endpoints, and health monitoring

**4. How to Use This Standard for New Tools**

1.  Develop your tool in the `tradeblock-cursor/projects/[tool-name]/` directory following Flask best practices.
2.  Ensure your tool has proper security measures: input validation, environment variable secrets, error handling.
3.  Implement a `/health` endpoint for monitoring.
4.  Contact `@vercel-debugger` to initiate the deployment process.
5.  `@vercel-debugger` will copy your tool to `main-ai-apps/tools/[tool-name]/` and configure for subpath deployment.
6.  `@vercel-debugger` will handle Vercel configuration, environment variables, and domain setup using deployment protocol safety tools.
7.  Test your tool at `https://internalops.tradeblock.us/tools/[tool-name]` before marking deployment complete.

**5. Documentation Reference**

Complete deployment documentation is available at:
`/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/internalops-deployment-guide.md`

This comprehensive guide covers:
- Detailed setup procedures
- Vercel configuration patterns
- Security implementation
- Troubleshooting guides
- Performance optimization
- Migration workflows

---

### **Standard #5: Repository Safety Protocols**

**1. Principle (The "Why")**

To prevent data loss, file deletion incidents, and repository corruption during Git operations and deployments, we will use mandatory safety protocols that include backup creation, conflict detection, and recovery procedures. These protocols were developed in response to file deletion incidents during repository repair operations and ensure such incidents never occur again.

**2. The Standard (The "How")**

This is the required safety process for all Git operations and deployments.

-   **A. File Deletion Prevention**: Files **MUST NEVER** be deleted during Git operations (cherry-pick, rebase, reset). Git operations must be completed first, then file cleanup handled as a separate step with explicit user approval.

-   **B. Mandatory Backup for Risky Operations**: Before risky Git operations (force pushes, history rewrites, large merges with conflicts), `@vercel-debugger` **MUST** create backups:
    -   **Command**: `git stash push -m "backup_$(date +%Y%m%d_%H%M%S)" --include-untracked`
    -   **Before deployments**: Use deployment protocol backup functions
    -   **Documentation**: Document what operation is being performed and why

-   **C. Repository Context Verification**: Before any Git operation, verify current repository context:
    -   **Use deployment protocol functions**: `whereami` command when available
    -   **Verify remote**: `git remote -v` to confirm correct repository
    -   **Check status**: `git status` to understand current state

-   **D. Deployment Protocol Tool Usage**: All deployment-related operations **MUST** use the established safety tools:
    -   **Location**: `/knowledge-blocks/tradeblock-foundational-knowledge/how-we-do-shit/deployment-protocol/`
    -   **Conflict Detection**: Run `detect-deployment-conflicts.sh` before major operations
    -   **Shell Functions**: Use safety functions for navigation and operations
    -   **Cleanup Protocol**: Use `deployment-cleanup-protocol.sh` for safe cleanup

-   **E. User Approval Requirements**: Explicit user approval **MUST** be obtained for:
    -   **Force pushes**: Any `git push --force` operation
    -   **Risky merges**: Merges with conflicts, large changesets, or history modifications
    -   **File deletion**: Any operation that will delete files from the repository
    -   **Repository structure changes**: Moving or reorganizing significant portions of the codebase

-   **F. Emergency Recovery Procedures**: If files are accidentally deleted or repository is corrupted:
    -   **STOP immediately**: Do not attempt additional Git commands
    -   **Check backups**: `git stash list` and `git reflog`
    -   **Use recovery tools**: Deployment protocol emergency restore functions
    -   **Document incident**: Record what happened and how it was resolved

**3. Reference Implementation**

The deployment protocol tools serve as the reference implementation for this standard:
-   **Safety Functions**: `/deployment-protocol/shell-functions-for-deployment.sh`
-   **Conflict Detection**: `/deployment-protocol/detect-deployment-conflicts.sh`
-   **Cleanup Protocol**: `/deployment-protocol/deployment-cleanup-protocol.sh`
-   **Documentation**: `/deployment-protocol/README.md`

**4. How to Use This Standard**

1.  Install deployment protocol safety functions in your shell profile
2.  Use `whereami` to verify repository context before Git operations
3.  Create backups before risky operations using specified commands
4.  Run conflict detection before major deployments or repository changes
5.  Get explicit user approval for any destructive operations
6.  Document all operations and maintain audit trail of changes

### API Interaction Patterns
- **Batch your requests.** When you need to fetch data for multiple items (e.g., fetching user details for a list of IDs), always prefer a single API call that accepts an array of IDs over making multiple requests in a loop. This is significantly more performant and reduces server load. For example, a single GraphQL query with an `in: [...]` filter is superior to N individual queries.


### **Standard #4: Agent Protocol for Handling User's Local `main` Branch Divergence**

**1. Principle (The "Why")**

The primary user is a founder, not a professional software engineer. Their workflow may involve making direct, iterative changes on their local `main` branch without immediately creating feature branches or committing. Therefore, it is common for the user's local `main` to contain valuable, unpushed work that is more up-to-date than the remote `origin/main`. My primary duty is to preserve this work and prevent data loss.

**2. The Standard (The "How")**

This is the required process for handling any divergence or conflict between the local `main` and `origin/main`.

-   **A. Core Assumption**: The user's local `main` branch is considered the source of truth for their most recent work. It **MUST NOT** be overwritten or reset without explicit analysis and user approval. The assumption is that unpushed commits are desired work, not outdated artifacts.

-   **B. Immediate Stop & Diagnose**: If a `git pull` or `git checkout` fails due to local changes or divergence, **ALL** automated git operations **MUST STOP**.

-   **C. Abort Failed Merges**: The first step is always to return to a clean state by aborting any failed merge attempt.
    -   **Command**: `git merge --abort`

-   **D. Comprehensive Analysis & Backup**: Before any resolution is attempted, a complete analysis of **ALL** local changes is mandatory.
    1.  **Identify Uncommitted Work**: Run `git status` to get a list of all modified but uncommitted files.
    2.  **Identify Diverged Commits**: Run `git log origin/main..main` to get a list of all local commits that are not on the remote branch.
    3.  **Summarize for User**: Present a clear summary of both uncommitted files and diverged commits to the user. State clearly that the default plan is to preserve **all** of this work.
    4.  **Create a Comprehensive Backup**: Execute `git stash push -m "backup-before-merge-resolution-$(date +%Y%m%d_%H%M%S)" --include-untracked`. This is a **MANDATORY** first step that saves all committed, staged, and unstaged local work into a safe stash.

-   **E. Never Recommend `reset --hard` First**: I will **NEVER** recommend `git reset --hard origin/main` as a primary solution, as this would delete the user's local work. This is a last-resort command that can only be used after the comprehensive backup stash has been created and the user has explicitly confirmed they want to discard their local changes.

-   **F. Guided Resolution**: After the backup is secure, guide the user through a safe resolution path, which typically involves:
    1.  Resetting the local branch to the remote state: `git reset --hard origin/main`. This is now safe because the work is backed up.
    2.  Re-applying the backed-up work: `git stash pop`.
    3.  Guiding the user through resolving any resulting conflicts within the files themselves.
    4.  Committing the newly merged and resolved work.