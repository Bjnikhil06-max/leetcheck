# LeakCheck 🔍

A zero-dependency secret scanner built entirely with the Node.js standard library.

LeakCheck scans source code, configuration files, and Git history for accidentally exposed credentials. Findings include confidence, severity, source location, detection signals, and redacted output.

## Why LeakCheck?

A secret can disappear from the current source code but still remain in Git history.

```text
Secret added
     ↓
Committed to Git
     ↓
Deleted from current file
     ↓
Still exists in Git history
     ↓
LeakCheck detects it

LeakCheck can detect both secrets in the current project and credentials that were removed from files but remain in Git history.

Zero Dependency Guarantee

LeakCheck has:

No npm packages
No third-party runtime dependencies
No external secret-scanning libraries
No copied or vendored third-party code

It is built entirely with Node.js built-in modules, including:

node:fs
node:fs/promises
node:path
node:crypto
node:child_process
node:util
node:test
node:assert/strict

For Git-history scanning, Git must also be installed and available on the system.

Features
Detects hardcoded passwords
Detects API keys and secrets
Detects access and bearer tokens
Detects AWS access keys
Detects GitHub tokens
Detects JWTs
Detects Slack tokens
Detects Stripe live keys
Detects Twilio keys
Detects SendGrid API keys
Detects private keys
Detects suspicious high-entropy strings
Scans Git history for removed secrets
Supports .leakcheckignore
Supports wildcard ignore patterns
Supports JSON output for CI
Supports strict mode
Detects secrets in comments with reduced confidence
Redacts detected secret values
Uses no third-party runtime dependencies
Requirements
Node.js
Git (only required for --history)
Quick Start

LeakCheck runs directly with Node.js. No package installation is required.

Scan the current project:

node src/cli.js .

Scan a specific project:

node src/cli.js ./demo-project

Scan Git history:

node src/cli.js --history .

Output machine-readable JSON:

node src/cli.js --json .

Use strict mode for CI/CD:

node src/cli.js --strict .

Show help:

node src/cli.js --help
Exit Codes
Code	Meaning
0	Successful scan; findings do not fail normal mode
1	Invalid or inaccessible scan target
2	HIGH or CRITICAL findings detected in strict mode

Normal mode reports findings without failing the command.

Strict mode is intended for CI/CD pipelines and returns 2 when HIGH or CRITICAL findings are detected.

Ignore Files

Create a .leakcheckignore file in the project root to exclude files or directories from scanning.

Example:

.env.local
secrets/
*.generated.js
config/*.local.js

Blank lines and lines beginning with # are ignored.

Wildcard patterns are supported.

JSON Output

Use --json for machine-readable output:

node src/cli.js --json .

Findings contain:

type
line
match
fingerprint
confidence
severity
signals
location
source

Detected secret values are redacted and are never intentionally included in findings.

Example:

API_KEY=[REDACTED]
Git History Scanning

Use:

node src/cli.js --history .

LeakCheck examines removed lines from Git history and reports historical credentials without exposing their actual values.

This helps detect a common security mistake:

Secret added
     ↓
Committed to Git
     ↓
Secret deleted from the current file
     ↓
Credential remains in Git history
     ↓
LeakCheck finds the historical exposure

Historical findings include the relevant commit information while keeping detected secret values redacted.

Confidence and Severity

LeakCheck uses multiple signals to prioritize findings.

Signals can include:

Known secret patterns
Credential-like variable names
Credential length
Encoded or random-looking values
Shannon entropy
Placeholder values
Example or test files
Comments

Comments and example/test files receive reduced confidence because they may contain intentionally documented or non-production credentials.

Findings are classified as:

CRITICAL
HIGH
MEDIUM
LOW
Security

LeakCheck is a detection tool and does not guarantee that every secret will be found.

If a real credential is detected, it should be revoked or rotated rather than merely deleted from the source file.

See SECURITY.md for the security model, threat assumptions, redaction approach, and cryptographic decisions.

Development

Run the complete test suite:

npm test

LeakCheck uses Node.js's built-in test runner and assertion library.

No third-party test framework is required.

See STDLIB.md for details about the Node.js standard-library APIs used by the project.

Project Structure
src/
├── analyzer.js
├── cli.js
├── config.js
├── detector.js
├── entropy.js
├── git.js
└── scanner.js

test/
├── cli.test.js
├── detector.test.js
├── entropy.test.js
├── git.test.js
└── scanner.test.js

demo-project/
├── .env.example
├── Readme.md
├── hello.js
└── image.png

.leakcheckignore
.gitignore
LICENSE
package.json
README.md
SECURITY.md
STDLIB.md
License

See LICENSE.


### One important point

I deliberately changed the old:

```text
Install dependencies:
npm install

to:

LeakCheck runs directly with Node.js. No package installation is required.