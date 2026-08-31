# LeakCheck

A zero-dependency secret scanner for source code and Git history.

LeakCheck scans a project for accidentally exposed credentials and reports findings with confidence, severity, source location, and redacted output.

## Features

- Detects hardcoded passwords
- Detects API keys and secrets
- Detects access and bearer tokens
- Detects AWS access keys
- Detects GitHub tokens
- Detects JWTs
- Detects private keys
- Detects suspicious high-entropy strings
- Scans Git history for removed secrets
- Supports `.leakcheckignore`
- Supports wildcard ignore patterns
- Supports JSON output for CI
- Supports strict mode
- Redacts detected secret values
- Uses no third-party runtime dependencies

## Requirements

- Node.js
- Git (only required for `--history`)

## Usage

Install dependencies:

```text
npm install

Run a scan:

node src/cli.js .

Scan a specific project:

node src/cli.js ./demo-project

Scan Git history:

node src/cli.js --history .

Output JSON:

node src/cli.js --json .

Strict mode:

node src/cli.js --strict .

Show help:

node src/cli.js --help
Exit Codes
Code	Meaning
0	No findings
1	Invalid or inaccessible scan target
2	Potential secrets detected
Ignore Files

Create .leakcheckignore in the project root.

Example:

.env.local
secrets/
*.generated.js
config/*.local.js

Blank lines and lines beginning with # are ignored.

JSON Output

Use --json for machine-readable output:

node src/cli.js --json .

Findings contain:

type
line
redacted match
fingerprint
confidence
severity
detection signals
location
source

Secret values themselves are never included in findings.

Git History

Use:

node src/cli.js --history .

LeakCheck examines removed lines from Git history and reports historical credentials without exposing their actual values.

Development

Run the complete test suite:

npm test

LeakCheck uses Node.js built-in APIs and the built-in test runner.

See STDLIB.md for the standard-library implementation details.

Project Structure
src/
  analyzer.js
  cli.js
  config.js
  detector.js
  entropy.js
  git.js
  scanner.js

test/
  cli.test.js
  detector.test.js
  entropy.test.js
  git.test.js
  scanner.test.js

License

See LICENSE.