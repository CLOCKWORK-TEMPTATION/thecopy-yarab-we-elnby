// Detection patterns for LLM Guardrails Service

// Prompt Injection Detection Patterns
// SECURITY: Using simple word-boundary patterns instead of .{0,100} to prevent ReDoS
export const PROMPT_INJECTION_METRIC_PATTERN = 'ignore.*previous.*instructions';

export const BANNED_PATTERNS = [
  /ignore\b.*?\bprevious\b.*?\binstructions/i,
  /you are now/i,
  /forget\b.*?\babove/i,
  /disregard\b.*?\binstructions/i,
  /system\b.*?\bprompt/i,
  /system\b.*?\boverride/i,
  /roleplay\b.*?\bas\b/i,
  /act\b.*?\bas\b.*?\bif/i,
  /override\b.*?\brestrictions/i,
  /reveal\b.*?\b(secrets?|training\s+data|system\s+prompt)\b/i,
  /debug\b.*?\bmode/i,
  /exploit\b.*?\bvulnerability/i,
  /hack\b.*?\bsystem/i,
  /malicious\b.*?\bcode/i,
];

// Maximum length of content to check against patterns to prevent ReDoS
export const MAX_PATTERN_CHECK_LENGTH = 10000;

export const SUSPICIOUS_PATTERNS = [
  /system|admin|root|bypass|override|debug|exploit|hack|malicious|vulnerabilit(?:y|ies)|injection|attack/gi,
];

// PII Detection Patterns
export const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
  address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,
  name: /\b(?:Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  other: /(?!)/g,
};

// Harmful Content Patterns
export const HARMFUL_CONTENT_PATTERNS = [
  /\b(fuck(?:ing)?|shit(?:ty)?|damn|bitch|asshole|cunt|motherfucker)\b/i,
  /\b(hate|kill|murder|violence|attack|destroy)\b/i,
  /\b(racist|discrimination|supremacy|genocide)\b/i,
  /\b(terrorist|bomb|explosive|weapon)\b/i,
  /\b(drugs|narcotics|cocaine|heroin|meth)\b/i,
  /\b(porn|sexual|nude|explicit|adult)\b/i,
];

// Hallucination Indicators
export const HALLUCINATION_INDICATORS = [
  'i believe',
  'i think',
  'i feel',
  'i guess',
  'i suppose',
  'i assume',
  'it might',
  'it could',
  'it may',
  'it seems',
  'it appears',
  'probably',
  'possibly',
  'likely',
  'perhaps',
  'in my opinion',
  'in my experience',
  'in my view',
  'i don\'t know',
  'i do not know',
  'i don\'t remember',
  'i\'m not sure',
  'i\'m uncertain',
  'i\'m unsure',
  'it depends',
  'it varies',
  'it differs',
  'could be wrong',
  'might be incorrect',
  'might be mistaken',
  'might be wrong',
];

export const FACTUAL_CLAIM_PATTERNS = [
  /\b100%\b/i,
  /\ball\s+critics\s+agree\b/i,
  /\balways\s+\w+/i,
  /\bdefinitely\b/i,
  /\bbest\s+\w+\s+ever\b/i,
];

export const EXTERNAL_REFERENCE_PATTERN = /\b(?:https?:\/\/\S+|www\.\S+)\b/i;

export const REPEATED_SUSPICIOUS_TOKENS = new Set([
  'admin',
  'attack',
  'bypass',
  'debug',
  'exploit',
  'hack',
  'injection',
  'malicious',
  'override',
  'root',
  'security',
  'system',
  'vulnerability',
  'vulnerabilities',
]);
