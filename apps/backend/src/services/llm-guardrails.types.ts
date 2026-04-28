// Public types for LLM Guardrails Service

export interface GuardrailViolation {
  type: "prompt_injection" | "pii" | "harmful_content" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  pattern?: string;
  matches?: string[];
}

export interface PIIDetection {
  type:
    | "email"
    | "phone"
    | "ssn"
    | "credit_card"
    | "address"
    | "name"
    | "other";
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface GuardrailResult {
  isAllowed: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  violations: GuardrailViolation[];
  warnings?: string[];
  sanitizedContent?: string;
}

export interface GuardrailMetrics {
  totalRequests: number;
  blockedRequests: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  topPatterns: { pattern: string; count: number }[];
  recentViolations: GuardrailViolation[];
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
export interface CheckContext {
  userId?: string;
  requestType?: string;
}
