import { sha256 } from "../utils";
import type {
  IngestRawEventInput,
  SecretFinding,
  SecretScanEvent,
} from "./types";

interface SecretRule {
  id: string;
  pattern: RegExp;
}

export const MEMORY_SECRET_SCAN_POLICY = {
  scannerId: "persistent-agent-memory-secret-scan",
  usesGitAllowlist: false,
  defaultScanPaths: ["output/round-notes.md", "output/session-state.md"],
  allowedPreScanFields: [
    "source_ref",
    "file_path",
    "event_type",
    "content_hash",
    "detected_at",
    "scanner_version",
  ],
  prohibitedPreScanFields: [
    "raw_text",
    "full_content",
    "prompt_body",
    "file_content",
    "agent_output_text",
  ],
} as const;

export interface SecretScanResult {
  clean: boolean;
  scannerVersion: string;
  findings: SecretFinding[];
}

const SECRET_RULES: SecretRule[] = [
  {
    id: "postgres-url-with-credentials",
    pattern: /postgres(?:ql)?:\/\/[A-Za-z0-9._-]+:[^@\s'"]+@[A-Za-z0-9.-]+/gi,
  },
  {
    id: "redis-url-with-credentials",
    pattern: /redis:\/\/[A-Za-z0-9._-]+:[^@\s'"]+@[A-Za-z0-9.-]+/gi,
  },
  {
    id: "private-key-block",
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED)? ?PRIVATE KEY(?: BLOCK)?-----/gi,
  },
  {
    id: "inline-bearer-token",
    pattern: /\bbearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
  },
  {
    id: "google-adc-private-key",
    pattern: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/gi,
  },
  {
    id: "high-entropy-assignment",
    pattern: /\b[A-Z0-9_]*(?:API|TOKEN|SECRET|PASSWORD|KEY)[A-Z0-9_]*\s*=\s*["']?[A-Za-z0-9._~+/=-]{24,}/gi,
  },
];

export class MemorySecretScanner {
  readonly name = "memory-secret-scanner";
  readonly version = "memory-secret-scanner-v1";
  readonly policy = MEMORY_SECRET_SCAN_POLICY;

  scan(content: string): SecretScanResult {
    const findings: SecretFinding[] = [];

    for (const rule of SECRET_RULES) {
      for (const match of content.matchAll(rule.pattern)) {
        findings.push({
          ruleId: rule.id,
          fingerprint: sha256(`${rule.id}:${match.index ?? 0}:${match[0]}`),
        });
      }
    }

    return {
      clean: findings.length === 0,
      scannerVersion: this.version,
      findings,
    };
  }

  buildRejectedEvent(input: IngestRawEventInput): Omit<SecretScanEvent, "id" | "createdAt"> {
    const scan = this.scan(input.content);

    return {
      sourceRef: input.sourceRef,
      eventType: input.eventType,
      contentHash: sha256(input.content),
      scannerName: this.name,
      scannerVersion: scan.scannerVersion,
      status: "rejected",
      matchedRuleIds: scan.findings.map((finding) => finding.ruleId),
      redactedPreview: `redacted:${sha256(input.content).slice(0, 16)}`,
      actionTaken: "rejected",
      redactedMetadata: {
        findingCount: scan.findings.length,
        fingerprints: scan.findings.map((finding) => finding.fingerprint),
      },
    };
  }

  buildCleanEvent(input: IngestRawEventInput): Omit<SecretScanEvent, "id" | "createdAt"> {
    const contentHash = sha256(input.content);
    return {
      sourceRef: input.sourceRef,
      eventType: input.eventType,
      contentHash,
      scannerName: this.name,
      scannerVersion: this.version,
      status: "clean",
      matchedRuleIds: [],
      redactedPreview: `clean:${contentHash.slice(0, 16)}`,
      actionTaken: "stored",
      redactedMetadata: {
        findingCount: 0,
      },
    };
  }

  buildPurgedEvent(input: IngestRawEventInput): Omit<SecretScanEvent, "id" | "createdAt"> {
    const scan = this.scan(input.content);
    return {
      sourceRef: input.sourceRef,
      eventType: input.eventType,
      contentHash: sha256(input.content),
      scannerName: this.name,
      scannerVersion: scan.scannerVersion,
      status: "quarantined",
      matchedRuleIds: scan.findings.map((finding) => finding.ruleId),
      redactedPreview: `purged:${sha256(input.content).slice(0, 16)}`,
      actionTaken: "purged",
      redactedMetadata: {
        findingCount: scan.findings.length,
        fingerprints: scan.findings.map((finding) => finding.fingerprint),
      },
    };
  }
}

