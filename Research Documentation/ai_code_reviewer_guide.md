# Building an AI Code Reviewer for Pull Requests
## Complete Implementation Guide for Maintainers & Contributors

---

## EXECUTIVE OVERVIEW

An AI code reviewer engine analyzes pull requests and provides intelligent feedback to:
- **Contributors**: Get instant feedback before human review (learn faster, reduce back-and-forth)
- **Maintainers**: Reduce manual review time, catch critical issues first, maintain code standards

**Real-world impact**: 40-60% reduction in review time + 70% fewer missed issues (per BitsAI-CR research)

---

## PART 1: ARCHITECTURE & CORE COMPONENTS

### System Architecture Overview

```
GitHub PR Event
    ↓
[GitHub API] → Pull PR diff, files, commit context
    ↓
[Ingestion Layer] → Parse files, build context, extract changed code
    ↓
[Analysis Pipeline]
    ├─ RuleChecker (LLM) → Detect issues against ruleset
    ├─ ReviewFilter (LLM) → Validate high-confidence issues only
    ├─ Security Scan → Check for vulnerabilities
    └─ Performance Analyzer → Flag inefficiencies
    ↓
[Feedback Generation] → Format comments, suggest fixes
    ↓
[GitHub API] → Post comments, suggestions, approval/request changes
    ↓
[Feedback Loop] → Track if developer acts on suggestions → Improve rules
```

### Key Components Explained

#### 1. **Ingestion Layer** - Extract PR Context
**Responsibility**: Get all necessary code + context

**Data to extract:**
- Changed files (diffs - added/removed/modified lines)
- Full file content (needed for semantic understanding)
- Commit message + PR description
- Repository metadata (language, framework, size)
- Repository history (to understand codebase patterns)

**Implementation**:
```python
import requests

def fetch_pr_diff(owner, repo, pr_number, github_token):
    """Get unified diff of PR changes"""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = {"Authorization": f"Bearer {github_token}"}
    
    # Get PR metadata
    pr_data = requests.get(url, headers=headers).json()
    
    # Get files changed
    files_url = f"{url}/files"
    files = requests.get(files_url, headers=headers).json()
    
    return {
        "title": pr_data["title"],
        "description": pr_data["body"],
        "files": files,  # Each has: patch, filename, additions, deletions
        "head_sha": pr_data["head"]["sha"]
    }
```

#### 2. **Rule Checker** - Detect Issues (First-Stage LLM)
**Responsibility**: Identify potential problems using fine-tuned model

**Rule Categories** (Taxonomy of 50-100 rules):
- **Security**: SQL injection, hardcoded secrets, missing input validation
- **Performance**: N+1 queries, inefficient loops, memory leaks
- **Best Practices**: Proper error handling, logging, documentation
- **Type Safety**: Missing type hints, type mismatches
- **Testing**: Insufficient test coverage, missing edge cases
- **Code Structure**: DRY violations, high cyclomatic complexity
- **Framework-Specific**: React hooks rules, Django ORM patterns, etc.

**Implementation**:
```python
from anthropic import Anthropic

def analyze_code_with_rulecheck(code_diff, file_context, rules_taxonomy):
    """
    Use LLM to detect issues against ruleset
    Returns: List of {rule_id, severity, line, suggestion}
    """
    client = Anthropic()
    
    prompt = f"""
    You are a senior code reviewer. Analyze this code change against these rules:
    
    RULES:
    {format_rules(rules_taxonomy)}
    
    CHANGED CODE:
    {code_diff}
    
    FULL FILE CONTEXT:
    {file_context}
    
    For each rule violation:
    1. State the rule violated
    2. Line number in diff
    3. Why it matters
    4. Suggested fix
    
    Format: RULE_ID | severity (critical/high/medium/low) | line | issue | fix
    """
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return parse_review_output(response.content[0].text)
```

#### 3. **Review Filter** - Validate High-Confidence Issues (Second-Stage LLM)
**Responsibility**: Remove false positives + verify issues are actionable

**Filter criteria**:
- Is this issue technically correct? (not a false positive)
- Is this practically useful? (would developer actually act on it)
- Is this within scope of the PR? (not existing code smell)
- Is this high enough priority to mention?

**Precision Target**: 70%+ (only flag issues developers will actually fix)

**Implementation**:
```python
def review_filter(detected_issues, full_context):
    """
    Second-stage LLM validates each issue
    Returns: Filtered list of high-confidence issues only
    """
    client = Anthropic()
    
    prompt = f"""
    Review these detected code issues and filter out false positives:
    
    DETECTED ISSUES:
    {format_issues(detected_issues)}
    
    FULL CODE CONTEXT:
    {full_context}
    
    For each issue, determine:
    1. Is it a real issue? (yes/no)
    2. Is it in scope of this PR? (yes/no) 
    3. Severity if real (critical/high/medium/low/trivial)
    4. Developer action rate (will they actually fix this? high/medium/low)
    
    ONLY include issues with:
    - Real issue = YES
    - In scope = YES
    - Severity >= MEDIUM
    - Action rate = HIGH or MEDIUM
    """
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return parse_filtered_issues(response.content[0].text)
```

#### 4. **Security Analyzer** - Dedicated Security Scan
**Responsibility**: Flag vulnerabilities + compliance issues

**Checks**:
- Hardcoded secrets/credentials
- SQL injection risks
- XSS vulnerabilities
- CSRF protection missing
- Authentication/authorization issues
- Crypto misuse
- Dependency vulnerabilities

**Implementation**:
```python
import re
import requests

def security_scan(code_diff, dependencies):
    """Multi-layer security scanning"""
    issues = []
    
    # Layer 1: Pattern matching (secrets, hardcoded credentials)
    secret_patterns = [
        (r"api[_-]?key\s*=\s*['\"]([a-zA-Z0-9]+)['\"]", "Hardcoded API key"),
        (r"password\s*=\s*['\"].*?['\"]", "Hardcoded password"),
        (r"aws_access_key_id\s*=", "AWS credentials exposed"),
    ]
    
    for pattern, issue_type in secret_patterns:
        if re.search(pattern, code_diff, re.IGNORECASE):
            issues.append({
                "type": "CRITICAL_SECURITY",
                "issue": issue_type,
                "suggestion": "Never hardcode secrets. Use environment variables or secrets management"
            })
    
    # Layer 2: LLM-based vulnerability detection
    client = Anthropic()
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"Identify security vulnerabilities in this code:\n{code_diff}"
        }]
    )
    
    issues.extend(parse_security_issues(response.content[0].text))
    
    # Layer 3: Check dependencies for known vulnerabilities
    for dep in dependencies:
        vuln_check = check_dependency_vulnerabilities(dep)
        if vuln_check:
            issues.append(vuln_check)
    
    return issues
```

#### 5. **Performance Analyzer** - Performance Issues
**Responsibility**: Identify performance bottlenecks

**Checks**:
- N+1 query problems (database loops)
- Inefficient algorithms (O(n²) in loop)
- Memory leaks (closures, event listeners)
- Unnecessary re-renders (React)
- String concatenation in loops
- Large object cloning

**Implementation**:
```python
def performance_scan(code_diff, language):
    """Detect performance anti-patterns"""
    client = Anthropic()
    
    performance_rules = """
    Common performance issues:
    1. N+1 queries: Loop making database calls inside
    2. Inefficient loops: O(n²) where O(n log n) possible
    3. Memory: Large allocations in hot paths
    4. React: Component re-rendering unnecessarily
    5. String ops: Concatenation in loops (use StringBuilder)
    """
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"{performance_rules}\n\nAnalyze this {language} code:\n{code_diff}"
        }]
    )
    
    return parse_performance_issues(response.content[0].text)
```

---

## PART 2: GITHUB INTEGRATION

### Setup as GitHub App

**Why GitHub App vs Webhook?**
- Better authentication + scoping
- Can request specific permissions
- Cleaner installation experience
- Can be distributed via Marketplace

**Implementation Steps**:

```python
from flask import Flask, request
from github import Github
from cryptography.hazmat.primitives import hashes
import jwt
import time

app = Flask(__name__)
GITHUB_APP_ID = "YOUR_APP_ID"
GITHUB_PRIVATE_KEY = "YOUR_PRIVATE_KEY"

def get_app_token():
    """Generate JWT for GitHub App authentication"""
    now = int(time.time())
    payload = {
        'iss': GITHUB_APP_ID,
        'iat': now,
        'exp': now + 300  # 5 minute expiry
    }
    
    token = jwt.encode(payload, GITHUB_PRIVATE_KEY, algorithm='HS256')
    return token

def get_installation_token(installation_id):
    """Get token for specific repo installation"""
    app_token = get_app_token()
    
    response = requests.post(
        f"https://api.github.com/app/installations/{installation_id}/access_tokens",
        headers={
            "Authorization": f"Bearer {app_token}",
            "Accept": "application/vnd.github.v3+json"
        }
    )
    
    return response.json()["token"]

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """Handle GitHub webhook events"""
    event = request.headers.get('X-GitHub-Event')
    payload = request.json
    
    if event == 'pull_request' and payload['action'] == 'opened':
        installation_id = payload['installation']['id']
        pr_number = payload['pull_request']['number']
        owner = payload['repository']['owner']['login']
        repo = payload['repository']['name']
        
        # Run analysis
        analyze_and_review_pr(owner, repo, pr_number, installation_id)
        
        return 'OK', 200

def analyze_and_review_pr(owner, repo, pr_number, installation_id):
    """Main analysis pipeline"""
    # Get installation token
    token = get_installation_token(installation_id)
    
    # Fetch PR data
    pr_data = fetch_pr_diff(owner, repo, pr_number, token)
    
    # Run analysis pipeline
    comments = []
    for file_change in pr_data['files']:
        # Get file content
        file_content = fetch_file_content(owner, repo, file_change['filename'], token)
        
        # Run analysis
        issues = run_analysis_pipeline(file_change['patch'], file_content)
        
        # Convert to GitHub comments
        comments.extend(format_github_comments(issues, file_change['filename']))
    
    # Post comments to PR
    post_review_comments(owner, repo, pr_number, comments, token)
```

### Posting Review Comments to GitHub

**Two types of feedback**:
1. **Inline suggestions** (review comment on specific line)
2. **Summary comment** (general PR feedback)

```python
def post_review_comments(owner, repo, pr_number, comments, token):
    """Post comments as PR review"""
    g = Github(token)
    repo_obj = g.get_repo(f"{owner}/{repo}")
    pr = repo_obj.get_pull(pr_number)
    
    # Build review object
    review_body = "## 🤖 AI Code Review\n\n"
    review_comments = []
    
    for comment in comments:
        if comment['type'] == 'inline':
            review_comments.append({
                "path": comment['file'],
                "line": comment['line'],
                "side": "RIGHT",  # New code side
                "body": comment['message']
            })
        else:
            review_body += f"- {comment['message']}\n"
    
    # Post review with comments
    pr.create_review(
        body=review_body,
        event='COMMENT',  # APPROVE, COMMENT, or REQUEST_CHANGES
        comments=review_comments
    )
```

---

## PART 3: DATA FLYWHEEL & CONTINUOUS IMPROVEMENT

### Problem: Low Precision Comments
**Issue**: 60% of AI review comments are ignored by developers
**Solution**: Track "Outdated Rate" = % of flagged code that developers actually modified

### Feedback Loop Architecture

```
PR Review Posted
    ↓
[30 days later] → Check if developer modified flagged lines
    ↓
Calculate Outdated Rate per rule
    ↓
Rules with <30% Outdated Rate → Mark as low-value
    ↓
Dynamically disable/adjust low-value rules
    ↓
Better precision next time
```

**Implementation**:

```python
def calculate_outdated_rate(rule_id, initial_pr, current_commit):
    """
    Measure if developers acted on a rule suggestion
    
    Outdated Rate = (flagged lines that stayed unchanged) / (total flagged lines)
    
    High rate = developer ignored it → Rule is low-value
    Low rate = developer fixed it → Rule is valuable
    """
    
    # Get lines flagged by this rule in initial PR
    flagged_lines = get_rule_flagged_lines(rule_id, initial_pr)
    
    # Check current state of those lines in repo
    current_lines = fetch_current_lines(flagged_lines, current_commit)
    
    unchanged_count = sum(1 for line in flagged_lines 
                         if line_unchanged(line, current_lines))
    
    outdated_rate = unchanged_count / len(flagged_lines)
    
    return {
        "rule_id": rule_id,
        "outdated_rate": outdated_rate,
        "quality": "low" if outdated_rate > 0.7 else "high"
    }

def update_rules_based_feedback(feedback_data):
    """Dynamically adjust review rules"""
    for rule_metric in feedback_data:
        rule_id = rule_metric['rule_id']
        outdated_rate = rule_metric['outdated_rate']
        
        if outdated_rate > 0.7:
            # Disable rule - developers don't care
            disable_rule(rule_id)
        elif outdated_rate < 0.3:
            # Increase rule weight - very valuable
            increase_rule_weight(rule_id)
```

---

## PART 4: REVENUE MODELS & MONETIZATION

### For Contributors (Free Tier)
- Instant AI feedback on PRs (up to 3 PRs/month free)
- Basic security scanning
- Simple performance analysis
- Free for public repositories

### For Maintainers (Paid Tier) - $30-100/month
- **Unlimited reviews**
- **Custom rule sets** (enforce team standards)
- **Security + performance deep-dive**
- **Customizable severity levels**
- **Team dashboard** (review analytics)
- **Slack/Discord notifications**
- **GitHub + GitLab + Bitbucket support**

### For Enterprises - $500+/month
- **On-premise deployment**
- **SSO integration**
- **Priority support**
- **Custom model fine-tuning** (learn from your codebase)
- **Compliance features** (SOC2, HIPAA, etc.)

---

## PART 5: IMPLEMENTATION ROADMAP

### Week 1-2: MVP - Basic Code Analysis
**Goal**: Analyze PR diff + post simple comments

**Deliverables**:
- [ ] GitHub App setup
- [ ] Fetch PR diff
- [ ] Basic LLM analysis (5-10 simple rules)
- [ ] Post inline comments
- [ ] Basic security scanning

**Estimated effort**: 40 hours

### Week 3-4: Rule Engine & Precision
**Goal**: Comprehensive rule set + Review Filter for precision

**Deliverables**:
- [ ] 50+ rule taxonomy
- [ ] ReviewFilter (2nd-stage LLM)
- [ ] Security analyzer
- [ ] Performance analyzer
- [ ] Rule configuration system

**Estimated effort**: 60 hours

### Week 5-6: Feedback Loop & Improvements
**Goal**: Track effectiveness + continuous improvement

**Deliverables**:
- [ ] Outdated Rate tracking
- [ ] Rule performance dashboard
- [ ] Dynamic rule adjustment
- [ ] Beta testing with 10 repos
- [ ] Feedback collection system

**Estimated effort**: 50 hours

### Week 7-8: Polish & Monetization
**Goal**: Production-ready + revenue generation

**Deliverables**:
- [ ] GitHub Marketplace listing
- [ ] Stripe integration
- [ ] Pricing tiers
- [ ] Documentation + tutorials
- [ ] Customer support system
- [ ] Analytics dashboard

**Estimated effort**: 60 hours

---

## PART 6: TECH STACK RECOMMENDATIONS

### Backend
- **Framework**: FastAPI or Flask (Python handles AI well)
- **LLM**: Claude API (best for code review), or local LLaMa for cost savings
- **Database**: PostgreSQL (track rules, feedback, user data)
- **Cache**: Redis (cache analysis results, LLM responses)
- **Task Queue**: Celery (async PR processing, feedback analysis)

### Frontend
- **Dashboard**: React or Vue
- **Real-time**: WebSockets for live feedback
- **Analytics**: Grafana or custom charts

### Infrastructure
- **Hosting**: Railway, Render, or AWS Lambda
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry for errors, DataDog for performance

### Stack Summary:
```
FastAPI + Claude API + PostgreSQL + React
= Simple, scalable, AI-powered code review platform
```

---

## PART 7: COMPETITIVE ADVANTAGES

### vs. CodeRabbit
- **Better precision** (filter out 50% more false positives)
- **Targeted analysis** (security / performance / structure separately)
- **Feedback loop** (continuously learn from developer actions)

### vs. GitHub Copilot
- **Focused on maintainability** (not just code generation)
- **Better for team standards** (custom rules)
- **Lower cost** (not per-seat pricing)

### vs. Manual Review
- **40-60% faster** (AI does first pass)
- **Never miss security issues** (pattern-based + LLM)
- **Consistent standards** (rules applied uniformly)

---

## PART 8: KEY METRICS & SUCCESS CRITERIA

### For Contributors
- **Time to get feedback**: <2 minutes (vs. hours waiting for human review)
- **Quality of feedback**: 70%+ developer action rate (fix recommendations they actually use)
- **Safety**: 0 false security alarms (trust the tool)

### For Maintainers
- **Review time reduced**: 40-50%
- **Issues caught**: 70%+ of critical problems identified
- **False positives**: <20% (low noise)
- **Team adoption**: 80%+ of PRs reviewed

### Business Metrics
- **CAC** (Customer Acquisition Cost): <$100
- **LTV** (Lifetime Value): $500+ per customer
- **Churn**: <5% monthly
- **NPS**: >50 (promoters)

---

## PART 9: LAUNCH CHECKLIST

### Before Launch (Week 1-6)
- [ ] GitHub App created + tested with 5 repos
- [ ] Rule engine comprehensive (50+ rules)
- [ ] Security scanning robust
- [ ] Review filter removes 50%+ false positives
- [ ] Performance acceptable (<1 min per PR)
- [ ] Pricing tested with beta users

### Launch Day (Week 7)
- [ ] GitHub Marketplace listing live
- [ ] Free tier available (3 PRs/month)
- [ ] Paid tier ($30/mo) available
- [ ] Documentation complete
- [ ] Support email active
- [ ] Analytics tracking setup

### Post-Launch (Week 8+)
- [ ] Collect beta user feedback
- [ ] Monitor precision metrics
- [ ] Iterate on rules
- [ ] Marketing push (Product Hunt, Hacker News, dev communities)
- [ ] Iterate on UX based on usage data

---

## END IMPLEMENTATION GUIDE