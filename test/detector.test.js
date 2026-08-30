import test from "node:test";
import assert from "node:assert/strict";
import { detectSecrets } from "../src/detector.js";

test("detects a hardcoded password", () => {
  const source = `
    const password = "superSecret123";
  `;

  const findings = detectSecrets(source, "app.js");

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, "Hardcoded Password");
  assert.equal(findings[0].severity, "HIGH");
});

test("detects an API key", () => {
  const source = `
    const api_key = "abc123456789SECRET";
  `;

  const findings = detectSecrets(source, "config.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "API Key"
    )
  );
});

test("does not expose the secret in the finding", () => {
  const secret = "SUPER_SECRET_PASSWORD_123";

  const source = `
    const password = "${secret}";
  `;

  const findings = detectSecrets(source, "app.js");

  assert.ok(findings.length > 0);
  assert.ok(!findings[0].match.includes(secret));
});

test("detects high entropy strings", () => {
  const source = `
    const value = "a8Fj92kLmP3xQ7vN9sZ2";
  `;

  const findings = detectSecrets(source, "config.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "High-Entropy String"
    )
  );
});

test("lowers confidence for example files", () => {
  const source = `
    const password = "example_password";
  `;

  const findings = detectSecrets(
    source,
    "README.md"
  );

  assert.equal(findings.length, 1);
  assert.ok(findings[0].confidence < 75);
});