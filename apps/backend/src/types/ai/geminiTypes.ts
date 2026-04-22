import type { GenerateContentResponse, Part } from "@google/generative-ai";

export interface GeminiServiceResult {
  success: boolean;
  data?: string;
  error?: GeminiError;
  rawResponse?: GenerateContentResponse;
}

export interface GeminiError {
  type: 'api' | 'network' | 'schema' | 'unknown';
  message: string;
  originalError?: unknown;
}

export interface GeminiApiError extends GeminiError {
  type: 'api';
  statusCode?: number;
  errorCode?: string;
}

export interface GeminiNetworkError extends GeminiError {
  type: 'network';
}

export interface GeminiSchemaError extends GeminiError {
  type: 'schema';
}

export function hasCandidates(response: GenerateContentResponse): boolean {
  return !!(response.candidates && response.candidates.length > 0);
}

export function hasValidContent(response: GenerateContentResponse): boolean {
  return !!(
    hasCandidates(response) &&
    response.candidates![0].content &&
    response.candidates![0].content.parts &&
    response.candidates![0].content.parts.length > 0
  );
}

export function extractTextFromCandidates(response: GenerateContentResponse): string {
  if (!hasValidContent(response)) return '';
  
  const parts = response.candidates![0].content.parts;
  return parts
    .filter((part: Part) => 'text' in part && part.text)
    .map((part: Part) => (part as { text: string }).text)
    .join('');
}

export function safeRegexMatch(text: string, pattern: RegExp): boolean {
  try {
    return pattern.test(text);
  } catch {
    return false;
  }
}

export function safeRegexMatchGroup(text: string, pattern: RegExp, groupIndex: number = 1): string | null {
  try {
    const match = text.match(pattern);
    return match && match[groupIndex] ? match[groupIndex] : null;
  } catch {
    return null;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string };
    return !!(
      err.code?.includes('NETWORK') ||
      err.code?.includes('TIMEOUT') ||
      err.message?.toLowerCase().includes('network') ||
      err.message?.toLowerCase().includes('timeout')
    );
  }
  return false;
}

export function isApiError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { status?: number; statusCode?: number };
    return !!(err["status"] || err.statusCode);
  }
  return false;
}
