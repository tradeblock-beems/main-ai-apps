# Internal Operations Deployment Guide

## Overview

This guide establishes the definitive deployment workflow for internal tools and applications on the `internalops.tradeblock.us` domain. This infrastructure supports our AI-first operational strategy by providing a centralized platform for internal tooling, analytics dashboards, and administrative interfaces.

## Architecture Overview

### Domain Structure
- **Primary Domain:** `internalops.tradeblock.us`
- **Tool Path Pattern:** `/tools/[tool-name]`
- **Example URLs:**
  - `https://internalops.tradeblock.us/tools/email-hub`
  - `https://internalops.tradeblock.us/tools/data-dashboard`
  - `https://internalops.tradeblock.us/tools/admin-panel`

### Repository Structure
- **Main Repository:** `main-ai-apps` (GitHub)
- **Tool Organization:** Each tool lives in `/tools/[tool-name]/` directory
- **Shared Resources:** Common assets, utilities, and configurations in `/shared/`

## Setup Process for New Internal Tools

### 1. Repository Preparation

#### A. Main Repository Setup (One-time)
```bash
# Create the main-ai-apps repository
git init main-ai-apps
cd main-ai-apps

# Create directory structure
mkdir -p tools shared docs
mkdir -p shared/css shared/js shared/components

# Create root configuration files
touch vercel.json
touch README.md
touch .gitignore
```

#### B. Tool-Specific Setup
```bash
# Navigate to tools directory
cd tools

# Create tool directory (replace [tool-name] with actual tool name)
mkdir [tool-name]
cd [tool-name]

# Copy tool files from development repository
# Example: Copy from tradeblock-cursor/projects/email-hub/
cp -r /path/to/tradeblock-cursor/projects/[tool-name]/* .

# Verify required files exist
ls -la
# Should see: app.py, requirements.txt, vercel.json, templates/, static/
```

### 2. Vercel Configuration

#### A. Root Level Configuration (`/vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "tools/*/app.py",
      "use": "@vercel/python",
      "config": {
        "runtime": "python3.11"
      }
    }
  ],
  "routes": [
    {
      "src": "/tools/([^/]+)/(.*)",
      "dest": "/tools/$1/app.py"
    },
    {
      "src": "/tools/([^/]+)/?$",
      "dest": "/tools/$1/app.py"
    }
  ],
  "functions": {
    "tools/*/app.py": {
      "runtime": "python3.11",
      "maxDuration": 300
    }
  }
}
```

#### B. Tool-Specific Configuration (`/tools/[tool-name]/vercel.json`)
```json
{
  "functions": {
    "app.py": {
      "runtime": "python3.11",
      "maxDuration": 300,
      "memory": 1024
    }
  },
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/app.py"
    }
  ]
}
```

### 3. Flask Application Configuration

#### A. Path-Aware Flask Setup
```python
from flask import Flask, request
import os

app = Flask(__name__)

# Configure for subpath deployment
APPLICATION_ROOT = f"/tools/{os.environ.get('TOOL_NAME', 'default')}"

@app.route('/')
def index():
    return render_template('index.html', app_root=APPLICATION_ROOT)

# Static file handling for subpath
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# API routes should include subpath awareness
@app.route('/api/<path:endpoint>')
def api_handler(endpoint):
    # Handle API requests with subpath context
    pass
```

#### B. Template Configuration
```html
<!-- In templates, use the app_root variable for all URLs -->
<link rel="stylesheet" href="{{ app_root }}/static/style.css">
<script src="{{ app_root }}/static/script.js"></script>

<!-- For forms and API calls -->
<form action="{{ app_root }}/generate-csv" method="post">
<!-- API calls in JavaScript -->
fetch(`${APP_ROOT}/api/data`)
```

## Deployment Procedures

### 1. Initial Deployment

#### A. Vercel Project Creation
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# From main-ai-apps repository root
vercel

# Follow prompts:
# - Set up and deploy? [Y/n] Y
# - Which scope? [Select your account]
# - Link to existing project? [N/y] N
# - What's your project's name? main-ai-apps
# - In which directory is your code located? ./
```

#### B. Domain Configuration
1. **Vercel Dashboard:**
   - Go to Project Settings → Domains
   - Add custom domain: `internalops.tradeblock.us`
   - Configure DNS records as prompted

2. **DNS Configuration:**
   - Add CNAME record: `internalops.tradeblock.us` → `cname.vercel-dns.com`
   - Wait for DNS propagation (5-15 minutes)

### 2. Subsequent Deployments

#### A. New Tool Addition
```bash
# From main-ai-apps repository
git add tools/[new-tool-name]/
git commit -m "feat: add [new-tool-name] internal tool"
git push origin main

# Automatic deployment triggered
# Verify at: https://internalops.tradeblock.us/tools/[new-tool-name]
```

#### B. Tool Updates
```bash
# Update tool files
git add tools/[tool-name]/
git commit -m "fix: update [tool-name] functionality"
git push origin main

# Monitor deployment in Vercel dashboard
```

## Environment Variable Management

### 1. Vercel Dashboard Configuration
- Navigate to Project Settings → Environment Variables
- Add variables for all environments (Production, Preview, Development)

### 2. Required Environment Variables
```bash
# Tool identification
TOOL_NAME=email-hub

# Database connections (if needed)
DATABASE_URL=postgresql://...

# API keys and secrets
STRIPE_SECRET_KEY=sk_live_...
MAILJET_API_KEY=...
MAILJET_SECRET_KEY=...

# Security configurations
FLASK_SECRET_KEY=...
```

### 3. Environment-Specific Settings
```python
# In app.py
import os

class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-fallback-key')
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    
    # Database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    # API configurations
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
```

## Best Practices

### 1. Code Organization
```
tools/
├── email-hub/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── vercel.json        # Deployment configuration
│   ├── templates/         # HTML templates
│   ├── static/           # CSS, JS, images
│   └── utils/            # Helper modules
├── data-dashboard/
│   └── [same structure]
└── admin-panel/
    └── [same structure]
```

### 2. Dependency Management
```txt
# requirements.txt - Keep minimal and specific
Flask==3.0.0
gunicorn==21.2.0
requests==2.31.0
python-dotenv==1.0.0
```

### 3. Security Considerations
- Use environment variables for all secrets
- Implement proper input validation
- Configure HTTPS-only cookies
- Add CSRF protection for forms
- Implement rate limiting for API endpoints

### 4. Performance Optimization
- Enable gzip compression
- Optimize static asset loading
- Use CDN for shared resources
- Implement caching for expensive operations

## Troubleshooting Guide

### 1. Common Deployment Issues

#### A. Build Failures
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing dependencies in requirements.txt
# - Python version mismatch
# - Import errors

# Solutions:
# - Update requirements.txt
# - Verify Python 3.11 compatibility
# - Check import paths
```

#### B. Runtime Errors
```python
# Add comprehensive error handling
import logging
import traceback

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal error: {str(error)}")
    logging.error(traceback.format_exc())
    return "Internal server error", 500
```

#### C. Path Resolution Issues
```python
# Verify subpath configuration
import os
from flask import request

def get_base_url():
    """Get the base URL for the current tool"""
    tool_name = os.environ.get('TOOL_NAME', 'default')
    return f"/tools/{tool_name}"

# Use in templates and redirects
```

### 2. Performance Issues

#### A. Slow Response Times
- Check function timeout settings (max 300s)
- Optimize database queries
- Implement caching for repeated operations
- Use async operations where possible

#### B. Memory Limits
- Monitor memory usage in Vercel dashboard
- Optimize data structures
- Implement pagination for large datasets
- Use streaming for file operations

### 3. Debugging Strategies

#### A. Local Development
```bash
# Set up local environment matching production
export TOOL_NAME=email-hub
export FLASK_ENV=development
python app.py

# Test at: http://localhost:5000/tools/email-hub
```

#### B. Production Debugging
```python
# Add detailed logging
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/debug')
def debug_info():
    if not app.debug:
        return "Debug info disabled", 403
    
    return {
        'environment': os.environ.get('VERCEL_ENV', 'local'),
        'tool_name': os.environ.get('TOOL_NAME', 'unknown'),
        'python_version': sys.version,
        'flask_version': flask.__version__
    }
```

## Access Control and Security

### 1. Authentication Strategy
```python
# Basic authentication for internal tools
from functools import wraps
from flask import request, jsonify

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_token = request.headers.get('Authorization')
        if not auth_token or not validate_token(auth_token):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/sensitive-data')
@require_auth
def sensitive_data():
    return jsonify({'data': 'sensitive_information'})
```

### 2. IP Whitelisting
```python
# Restrict access to specific IP ranges
ALLOWED_IPS = [
    '192.168.1.0/24',  # Office network
    '10.0.0.0/8',      # VPN network
]

@app.before_request
def restrict_ip():
    if request.remote_addr not in ALLOWED_IPS:
        return "Access denied", 403
```

### 3. Rate Limiting
```python
# Implement rate limiting for API endpoints
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/data')
@limiter.limit("10 per minute")
def api_data():
    return jsonify({'data': 'response'})
```

## Maintenance and Monitoring

### 1. Health Checks
```python
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connectivity
        # Check external API connectivity
        # Check file system access
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
```

### 2. Logging Strategy
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
if not app.debug:
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Application startup')
```

### 3. Performance Monitoring
```python
import time
from flask import g

@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        response_time = time.time() - g.start_time
        app.logger.info(f"Request completed in {response_time:.3f}s")
    return response
```

## Migration from Development to Production

### 1. Pre-Migration Checklist
- [ ] All environment variables configured
- [ ] Database connections tested
- [ ] External API keys validated
- [ ] Security measures implemented
- [ ] Performance optimization completed
- [ ] Error handling comprehensive
- [ ] Health check endpoint functional
- [ ] Logging configured
- [ ] Documentation updated

### 2. Migration Steps
```bash
# 1. Prepare production repository
git clone tradeblock-cursor main-ai-apps
cd main-ai-apps

# 2. Restructure for production
mkdir -p tools/email-hub
cp -r projects/email-hub/* tools/email-hub/

# 3. Update configurations
# - Update vercel.json for multi-tool routing
# - Update Flask app for subpath deployment
# - Update templates for path awareness

# 4. Test locally
export TOOL_NAME=email-hub
python tools/email-hub/app.py

# 5. Deploy to Vercel
vercel --prod

# 6. Verify deployment
curl https://internalops.tradeblock.us/tools/email-hub/health
```

### 3. Post-Migration Verification
1. **Functionality Testing:**
   - Test all major features
   - Verify API endpoints
   - Check file uploads/downloads
   - Test error handling

2. **Performance Testing:**
   - Monitor response times
   - Check memory usage
   - Verify timeout configurations

3. **Security Testing:**
   - Verify authentication
   - Test input validation
   - Check HTTPS enforcement

## Integration with External Services

### 1. Database Connections
```python
# PostgreSQL connection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(os.environ.get('DATABASE_URL'))
Session = sessionmaker(bind=engine)

@app.route('/api/data')
def get_data():
    session = Session()
    try:
        # Database operations
        pass
    finally:
        session.close()
```

### 2. API Integrations
```python
# Stripe API integration
import stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# Mailjet API integration
from mailjet_rest import Client
mailjet = Client(
    auth=(os.environ.get('MAILJET_API_KEY'), 
          os.environ.get('MAILJET_SECRET_KEY'))
)
```

### 3. File Storage
```python
# AWS S3 integration for file storage
import boto3

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if file:
        s3_client.upload_fileobj(file, 'internalops-bucket', file.filename)
        return jsonify({'success': True})
```

## Future Enhancements

### 1. Planned Features
- Central authentication system
- Shared component library
- Real-time monitoring dashboard
- Automated backup system
- Multi-environment support (staging/prod)

### 2. Scalability Considerations
- Microservices architecture
- Load balancing strategies
- Database sharding
- CDN integration
- Caching layers

### 3. Security Enhancements
- OAuth 2.0 integration
- Role-based access control
- Audit logging
- Vulnerability scanning
- Penetration testing schedule

---

## Quick Reference

### Essential Commands
```bash
# Deploy new tool
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Set environment variable
vercel env add [name] [value]

# Remove environment variable
vercel env rm [name]
```

### Key URLs
- **Production:** `https://internalops.tradeblock.us/tools/[tool-name]`
- **Vercel Dashboard:** `https://vercel.com/dashboard`
- **GitHub Repository:** `https://github.com/[org]/main-ai-apps`

### Support Contacts
- **Technical Issues:** @architect
- **Deployment Questions:** @conductor
- **Documentation Updates:** @scribe

---

*This guide is maintained by the @architect and updated with each new tool deployment. Last updated: [Date]* 