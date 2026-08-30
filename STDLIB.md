The dependencies field in package.json is empty:

"dependencies": {}
Standard Library Usage
Typical third-party package	Node.js standard library used
CLI argument parser	process.argv
Filesystem library	node:fs / node:fs/promises
Path utility library	node:path
Git integration library	node:child_process
Promise utilities	node:util
Hashing library	node:crypto
Test framework	node:test
Test assertions	node:assert/strict
Temporary test directories	node:os
What LeakCheck Uses the Standard Library For
File scanning

LeakCheck uses Node.js filesystem APIs to recursively read project
files without requiring a third-party file traversal package.

Path handling

node:path is used to safely construct and compare filesystem paths.

Git history

node:child_process executes the Git command needed to inspect repository
history.

Secret fingerprints

node:crypto provides SHA-256 hashing for identifying repeated historical
secrets without exposing the secret value itself.

Testing

LeakCheck uses Node.js's built-in test runner:

node:test
node:assert/strict

No external test framework is required.

Command-line interface

Command-line options are processed directly through:

process.argv

No CLI parsing package is required.

Third-Party Runtime Dependencies

None.

The shipped application requires only Node.js and, for Git-history
scanning, a Git installation.

Vendored Code

LeakCheck does not contain copied or vendored third-party source code.

All application code in src/ and test/ was written for this project.

