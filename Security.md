# Security Model

## Purpose

LeakCheck is a secret scanner designed to identify accidentally exposed
credentials in source code, configuration files, and Git history.

It is intended to help developers detect credentials before or after they
are committed to a repository.

## What LeakCheck Protects Against

LeakCheck can detect common forms of accidental credential exposure,
including:

- Hardcoded passwords
- API keys
- Generic secrets
- Access tokens
- Bearer tokens
- AWS access keys
- GitHub tokens
- JWTs
- Slack tokens
- Stripe live keys
- Twilio keys
- SendGrid API keys
- Private keys
- Suspicious high-entropy strings

LeakCheck can also inspect Git history for credentials that were removed
from the current working tree but remain in previous commits.

## What LeakCheck Does Not Protect Against

LeakCheck is a detection tool, not a complete security system.

It does not guarantee that all secrets will be detected.

It does not protect against:

- Secrets stored outside the scanned files or Git history
- Secrets hidden through sophisticated obfuscation
- Credentials exposed through external services
- Compromised machines
- Malware or malicious code execution
- Credentials that have already been compromised
- Secrets stored in systems that LeakCheck does not scan

A clean scan should therefore not be interpreted as proof that a project
contains no secrets.

## Secret Redaction

Detected secret values are never intentionally displayed in findings.

Findings use redacted output such as:

    API_KEY=[REDACTED]

For standalone credential formats such as AWS keys, GitHub tokens, JWTs,
and provider-specific tokens, the detected value is represented as:

    [REDACTED]

This reduces the risk of LeakCheck exposing the very secret it is designed
to detect.

## Secret Fingerprints

LeakCheck uses SHA-256 fingerprints to identify repeated secret values
without storing the original secret value in a finding.

The fingerprint is used for comparison and deduplication.

The secret itself is not included in the fingerprint field's output.

## Confidence and Severity

LeakCheck does not treat every detected pattern as equally trustworthy.

Confidence is influenced by signals such as:

- Known secret patterns
- Credential-like variable names
- Credential length
- Encoded or random-looking values
- Entropy
- Placeholder values
- Example or test files
- Comments

Comments and example/test files receive reduced confidence because they
may contain intentionally documented or non-production credentials.

## High-Entropy Detection

LeakCheck uses Shannon entropy to identify strings that appear random or
credential-like.

Entropy is treated as an additional signal rather than definitive proof
that a string is a secret.

This helps reduce false positives compared with treating every long
random-looking string as a credential.

## Git History

When `--history` is used, LeakCheck examines Git history for removed
secret-containing lines.

This is important because deleting a credential from the current version
of a file does not necessarily remove it from repository history.

Git-history scanning requires Git to be installed and available to the
environment running LeakCheck.

## Ignore Rules

Projects can use `.leakcheckignore` to exclude files or directories from
scanning.

Wildcard patterns are supported.

Ignoring a path means LeakCheck will not inspect that path, so ignored
locations should be treated as trusted by the user.

## Trust Assumptions

LeakCheck assumes:

- The machine running LeakCheck is trusted.
- The scanned files are accessible to the process.
- Git history is trustworthy and available when history scanning is used.
- Users understand that detection is heuristic and may produce false
  positives or false negatives.
- Users do not intentionally expose LeakCheck output containing sensitive
  information.

## Runtime Dependencies

LeakCheck uses Node.js built-in APIs and has no third-party runtime
dependencies.

Git is an external requirement only for Git-history scanning.

## Responsible Use

LeakCheck should be used to identify and remediate accidental credential
exposure.

If a real credential is detected, the credential should be revoked or
rotated rather than merely deleted from the source file.