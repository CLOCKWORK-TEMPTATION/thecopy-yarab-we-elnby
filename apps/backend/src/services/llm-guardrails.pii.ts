// PII detection and sanitization utilities for LLM Guardrails Service

import { PII_PATTERNS } from "./llm-guardrails.patterns";

import type { PIIDetection } from "./llm-guardrails.types";

export function detectPII(content: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      if (type === "credit_card" && match[0].replace(/\D/g, "").length < 13) {
        continue;
      }
      detections.push({
        type: type as PIIDetection["type"],
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: calculatePIIConfidence(
          type as PIIDetection["type"],
          match[0],
        ),
      });
    }
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
}

export function calculatePIIConfidence(
  type: PIIDetection["type"],
  value: string,
): number {
  const baseConfidence: Record<PIIDetection["type"], number> = {
    email: 0.95,
    phone: 0.8,
    ssn: 0.9,
    credit_card: 0.85,
    address: 0.7,
    name: 0.6,
    other: 0.5,
  };

  let confidence = baseConfidence[type] ?? 0.5;

  if (type === "email" && value.includes(".")) confidence += 0.05;
  if (type === "phone" && value.replace(/\D/g, "").length >= 10)
    confidence += 0.1;
  if (type === "credit_card" && isValidCreditCard(value)) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

export function isValidCreditCard(value: string): boolean {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length < 13 || numbers.length > 19) return false;

  let sum = 0;
  let isEven = false;
  for (let i = numbers.length - 1; i >= 0; i--) {
    const char = numbers[i];
    if (char) {
      let digit = parseInt(char, 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
  }
  return sum % 10 === 0;
}

export function sanitizePII(
  content: string,
  detections: PIIDetection[],
): string {
  let sanitized = content;
  for (const detection of detections) {
    sanitized = sanitized.replaceAll(
      detection.value,
      getPIIReplacement(detection.type),
    );
  }
  return sanitized;
}

export function getPIIReplacement(type: PIIDetection["type"]): string {
  const replacements: Record<PIIDetection["type"], string> = {
    email: "[EMAIL_REDACTED]",
    phone: "[PHONE_REDACTED]",
    ssn: "[SSN_REDACTED]",
    credit_card: "[CREDIT_CARD_REDACTED]",
    address: "[ADDRESS_REDACTED]",
    name: "[NAME_REDACTED]",
    other: "[PII_REDACTED]",
  };
  return replacements[type] ?? "[REDACTED]";
}
