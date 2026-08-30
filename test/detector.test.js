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

test("detects AWS access keys", () => {
  const source = `
    const key = "AKIAIOSFODNN7EXAMPLE";
  `;

  const findings = detectSecrets(source, "config.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "AWS Access Key"
    )
  );
});

test("detects GitHub tokens", () => {
  const source = `
    const token = "ghp_1234567890abcdefghijklmnopqrstuv";
  `;

  const findings = detectSecrets(source, "config.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "GitHub Token"
    )
  );
});

test("detects JWTs", () => {
  const source = `
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnopqrstuvwxyz123456";
  `;

  const findings = detectSecrets(source, "auth.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "JWT"
    )
  );
});

test("detects bearer tokens", () => {
  const source = `
    const header = "Bearer abcdefghijklmnop123456";
  `;

  const findings = detectSecrets(source, "request.js");

  assert.ok(
    findings.some(
      (finding) => finding.type === "Bearer Token"
    )
  );
});

test("detects private keys as critical findings", () => {
  const source = `
    -----BEGIN PRIVATE KEY-----
    fake-demo-key
    -----END PRIVATE KEY-----
  `;

  const findings = detectSecrets(source, "key.txt");

  const privateKey = findings.find(
    (finding) => finding.type === "Private Key"
  );

  assert.ok(privateKey);
  assert.equal(privateKey.severity, "CRITICAL");
  assert.equal(privateKey.confidence, 100);
});

test("redacts bare secrets completely", () => {
  const secret =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnopqrstuvwxyz123456";

  const source = `
    const token = "${secret}";
  `;

  const findings = detectSecrets(source, "auth.js");

  const jwt = findings.find(
    (finding) => finding.type === "JWT"
  );

  assert.ok(jwt);
  assert.equal(jwt.match, "[REDACTED]");
  assert.ok(!jwt.match.includes(secret));
});
test("does not flag ordinary text as a secret", () => {
  const source = `
    const message = "hello_world";
    const title = "welcome_to_my_app";
  `;

  const findings = detectSecrets(source, "app.js");

  assert.equal(findings.length, 0);
});

test("does not flag short random-looking strings", () => {
  const source = `
    const id = "a8Fj92kL";
  `;

  const findings = detectSecrets(source, "app.js");

  assert.equal(findings.length, 0);
});

test("does not expose AWS keys in findings", () => {
  const secret = "AKIAIOSFODNN7EXAMPLE";

  const source = `
    const key = "${secret}";
  `;

  const findings = detectSecrets(source, "config.js");

  const awsFinding = findings.find(
    (finding) => finding.type === "AWS Access Key"
  );

  assert.ok(awsFinding);
  assert.ok(!awsFinding.match.includes(secret));
});

test("does not expose GitHub tokens in findings", () => {
  const secret =
    "ghp_1234567890abcdefghijklmnopqrstuv";

  const source = `
    const token = "${secret}";
  `;

  const findings = detectSecrets(source, "config.js");

  const githubFinding = findings.find(
    (finding) => finding.type === "GitHub Token"
  );

  assert.ok(githubFinding);
  assert.ok(!githubFinding.match.includes(secret));
});
test("never exposes a GitHub token in a finding", () => {
  const secret =
    "ghp_1234567890abcdefghijklmnopqrstuv";

  const source = `
    const token = "${secret}";
  `;

  const findings = detectSecrets(source, "config.js");

  assert.ok(findings.length > 0);

  for (const finding of findings) {
    assert.ok(
      !JSON.stringify(finding).includes(secret)
    );
  }
});

test("never exposes a JWT in a finding", () => {
  const secret =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnopqrstuvwxyz123456";

  const source = `
    const token = "${secret}";
  `;

  const findings = detectSecrets(source, "auth.js");

  assert.ok(findings.length > 0);

  for (const finding of findings) {
    assert.ok(
      !JSON.stringify(finding).includes(secret)
    );
  }
});
test("gives known credential formats an additional confidence signal", () => {
  const source = `
    const token = "ghp_1234567890abcdefghijklmnopqrstuv";
  `;

  const findings = detectSecrets(source, "config.js");

  const githubFinding = findings.find(
    (finding) => finding.type === "GitHub Token"
  );

  assert.ok(githubFinding);
  assert.ok(
    githubFinding.signals.includes(
      "known credential format"
    )
  );
});

test("known credential formats have high confidence", () => {
  const source = `
    const token = "ghp_1234567890abcdefghijklmnopqrstuv";
  `;

  const findings = detectSecrets(source, "config.js");

  const githubFinding = findings.find(
    (finding) => finding.type === "GitHub Token"
  );

  assert.ok(githubFinding);
  assert.ok(githubFinding.confidence >= 70);
});

test("example files reduce credential confidence", () => {
  const source = `
    const token = "ghp_1234567890abcdefghijklmnopqrstuv";
  `;

  const findings = detectSecrets(
    source,
    "examples/config.js"
  );

  const githubFinding = findings.find(
    (finding) => finding.type === "GitHub Token"
  );

  assert.ok(githubFinding);
  assert.ok(
    githubFinding.signals.includes(
      "possible example/test file"
    )
  );
});
test("lowers confidence for obvious placeholder credentials", () => {
  const source = `
    const api_key = "your-api-key-here";
  `;

  const findings = detectSecrets(
    source,
    "config.js"
  );

  const finding = findings.find(
    (item) => item.type === "API Key"
  );

  assert.ok(finding);
  assert.ok(
    finding.signals.includes(
      "likely placeholder value"
    )
  );
  assert.ok(finding.confidence < 55);
});

test("does not treat a realistic credential as a placeholder", () => {
  const source = `
    const api_key = "abc123456789SECRET";
  `;

  const findings = detectSecrets(
    source,
    "config.js"
  );

  const finding = findings.find(
    (item) => item.type === "API Key"
  );

  assert.ok(finding);
  assert.ok(
    !finding.signals.includes(
      "likely placeholder value"
    )
  );
});
test("does not report a high-entropy duplicate for a known API key", () => {
  const source = `
    const api_key = "abc123456789SECRET";
  `;

  const findings = detectSecrets(
    source,
    "config.js"
  );

  const fingerprints = findings.filter(
    (finding) =>
      finding.fingerprint ===
      findings[0]?.fingerprint
  );

  const types = fingerprints.map(
    (finding) => finding.type
  );

  assert.ok(
    types.includes("API Key")
  );

  assert.equal(
    types.includes("High-Entropy String"),
    false
  );
});