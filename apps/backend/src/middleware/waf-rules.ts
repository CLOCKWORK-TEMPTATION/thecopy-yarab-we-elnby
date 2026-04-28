/**
 * WAF OWASP CRS-based Detection Patterns
 * Extracted from waf.middleware.ts to reduce file size (max-lines lint rule)
 */

import type { WAFRule, RuleCategory } from "./waf-types";

// ============================================================================
// OWASP CRS-based Detection Patterns
// ============================================================================

// SQL Injection Patterns (OWASP CRS 942)
export const SQL_INJECTION_PATTERNS: WAFRule[] = [
  {
    id: "942100",
    name: "SQL Injection Attack Detected via libinjection",
    description: "Detects SQL injection using common patterns",
    pattern:
      /(\bSELECT\b\s+(\*|(?:[`"'[]?[a-z_][\w$.\]`"']*\s*,\s*)*[`"'[]?[a-z_][\w$.\]`"']*)\s+\bFROM\b\s+[`"'[]?[a-z_][\w$.\]`"']*)|(\bINSERT\b\s+INTO\b[\s\S]{0,120}\bVALUES\b)|(\bUPDATE\b\s+[`"'[]?[a-z_][\w$.\]`"']*\s+\bSET\b)|(\bDELETE\b\s+FROM\b\s+[`"'[]?[a-z_][\w$.\]`"']*)|(\bDROP\b\s+(TABLE|DATABASE|VIEW|FUNCTION|PROCEDURE)\b)|(\bCREATE\b\s+(TABLE|DATABASE|VIEW|FUNCTION|PROCEDURE)\b)|(\bALTER\b\s+(TABLE|DATABASE)\b)|(\bTRUNCATE\b\s+TABLE\b)|(\bEXEC(?:UTE)?\b\s+[\w@])|(\bUNION\b\s+(ALL\s+)?SELECT\b)|(\bDECLARE\b\s+@?\w+)|(\b(OR|AND)\b\s+[\w'"]\s*[=<>])|('\s*(OR|AND)\s+'?\d)|(\bHAVING\b\s+\d)|(\bORDER\s+BY\b\s+\d)/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "942110",
    name: "SQL Injection Attack: Common Injection Testing Detected",
    description: "Detects common SQL injection test payloads",
    pattern:
      /('\s*(--|#|\/\*))|(\b(WAITFOR|BENCHMARK|SLEEP)\s*\()|(\bCHAR\s*\(\d+\))|(\bCONCAT\s*\(.*\))|(\bCONVERT\s*\()/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "942120",
    name: "SQL Injection Attack: SQL Operator Detected",
    description: "Detects SQL operators used in injection attacks",
    pattern:
      /(\bUNION\b\s+(ALL\s+)?SELECT)|(\b(AND|OR)\b\s+\d+\s*=\s*\d+)|(\bLIKE\b\s+['"]%)|(\bBETWEEN\b\s+\d+\s+AND\s+\d+)/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "942130",
    name: "SQL Injection Attack: SQL Tautology Detected",
    description: "Detects SQL tautologies (always-true conditions)",
    pattern:
      /('\s*OR\s+'?[^']*'?\s*=\s*'?[^']*'?)|(\d+\s*=\s*\d+)|('\s*=\s*')|(\bOR\s+1\s*=\s*1\b)|(\bAND\s+1\s*=\s*1\b)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "942140",
    name: "SQL Injection Attack: DB Names Detected",
    description: "Detects attempts to access database metadata",
    pattern:
      /(\b(INFORMATION_SCHEMA|SYS\.TABLES|SYSOBJECTS|MSysObjects|pg_catalog|SCHEMATA)\b)|(\bSHOW\s+(TABLES|DATABASES|COLUMNS)\b)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
];

// XSS Patterns (OWASP CRS 941)
export const XSS_PATTERNS: WAFRule[] = [
  {
    id: "941100",
    name: "XSS Attack Detected via libinjection",
    description: "Detects XSS using common script patterns",
    pattern:
      /(<script[^>]*>[\s\S]*?<\/script>)|(<script[^>]*>)|(\bon\w+\s*=)|(\bjavascript\s*:)|(\bdata\s*:\s*text\/html)|((^|[^a-z0-9_])alert\s*\()/gi,
    locations: ["body", "query", "headers"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "941110",
    name: "XSS Filter - Category 1: Script Tag Vector",
    description: "Detects script tag-based XSS attacks",
    pattern:
      /(<script)|(<\/script>)|(javascript\s*:)|(vbscript\s*:)|(livescript\s*:)/gi,
    locations: ["body", "query", "headers"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "941120",
    name: "XSS Filter - Category 2: Event Handler Vector",
    description: "Detects event handler-based XSS attacks",
    pattern:
      /\b(on(abort|activate|afterprint|afterupdate|beforeactivate|beforecopy|beforecut|beforedeactivate|beforeeditfocus|beforepaste|beforeprint|beforeunload|beforeupdate|blur|bounce|cellchange|change|click|contextmenu|controlselect|copy|cut|dataavailable|datasetchanged|datasetcomplete|dblclick|deactivate|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|error|errorupdate|filterchange|finish|focus|focusin|focusout|hashchange|help|input|keydown|keypress|keyup|layoutcomplete|load|losecapture|message|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|mousewheel|move|moveend|movestart|offline|online|pagehide|pageshow|paste|popstate|progress|propertychange|readystatechange|reset|resize|resizeend|resizestart|rowenter|rowexit|rowsdelete|rowsinserted|scroll|search|select|selectionchange|selectstart|start|stop|storage|submit|timeout|touchcancel|touchend|touchmove|touchstart|unload))\s*=/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "941130",
    name: "XSS Filter - Category 3: Attribute Vector",
    description: "Detects attribute-based XSS attacks",
    pattern:
      /(style\s*=\s*[^>]*expression\s*\()|(style\s*=\s*[^>]*url\s*\()|(style\s*=\s*[^>]*behavior\s*:)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "941140",
    name: "XSS Filter - Category 4: JavaScript URI Vector",
    description: "Detects JavaScript URI-based XSS attacks",
    pattern:
      /(href\s*=\s*['"]*\s*javascript\s*:)|(src\s*=\s*['"]*\s*javascript\s*:)|(action\s*=\s*['"]*\s*javascript\s*:)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "941150",
    name: "XSS Filter - Category 5: Dangerous HTML Tags",
    description: "Detects dangerous HTML tags",
    pattern:
      /(<iframe[^>]*>)|(<frame[^>]*>)|(<object[^>]*>)|(<embed[^>]*>)|(<applet[^>]*>)|(<meta[^>]*>)|(<link[^>]*>)|(<style[^>]*>)|(<base[^>]*>)|(<form[^>]*>)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "medium",
    enabled: true,
  },
];

// Command Injection Patterns (OWASP CRS 932)
export const COMMAND_INJECTION_PATTERNS: WAFRule[] = [
  {
    id: "932100",
    name: "Remote Command Execution: Unix Command Injection",
    description: "Detects Unix command injection attempts",
    pattern:
      /(\||;|`|\$\(|\${)|(&&|\|\|)|(\bcat\b|\bls\b|\bpwd\b|\bwhoami\b|\bid\b|\buname\b|\bnetstat\b|\bps\b|\bwget\b|\bcurl\b|\bnc\b|\btelnet\b|\bssh\b|\bscp\b|\bchmod\b|\bchown\b|\brm\b|\bcp\b|\bmv\b)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "932110",
    name: "Remote Command Execution: Windows Command Injection",
    description: "Detects Windows command injection attempts",
    pattern:
      /(\bcmd\b|\bcmd\.exe\b|\bpowershell\b|\bpowershell\.exe\b)|(\bnet\s+(user|localgroup|share|use)\b)|(\breg\s+(query|add|delete)\b)|(\bwmic\b)|(\btasklist\b|\btaskkill\b)|(\btype\b\s+[a-z]:\\)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "932120",
    name: "Remote Command Execution: Shell Injection",
    description: "Detects shell metacharacter injection",
    pattern:
      /(;|\||`|\$\(|\${|\beval\b|\bexec\b|\bsystem\b|\bpassthru\b|\bshell_exec\b|\bpopen\b|\bproc_open\b)/gi,
    locations: ["body", "query"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
];

// Path Traversal Patterns (OWASP CRS 930)
export const PATH_TRAVERSAL_PATTERNS: WAFRule[] = [
  {
    id: "930100",
    name: "Path Traversal Attack (/../)",
    description: "Detects path traversal attempts",
    pattern:
      /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)|(\.\.\/)|(\/etc\/passwd|\/etc\/shadow|\/proc\/self)/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "930110",
    name: "Path Traversal Attack: OS File Access",
    description: "Detects attempts to access sensitive OS files",
    pattern:
      /(\/etc\/(passwd|shadow|hosts|group|sudoers))|(\/proc\/(self|version|cpuinfo|meminfo))|(C:\\Windows\\|C:\\System32\\|C:\\boot\.ini)/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "930120",
    name: "Path Traversal Attack: Encoded Traversal",
    description: "Detects URL-encoded path traversal attempts",
    pattern:
      /(%00|%0d%0a|%252e%252e%252f|%c0%ae%c0%ae%c0%af|%uff0e%uff0e%u2215|%uff0e%uff0e%u2216)/gi,
    locations: ["body", "query", "path"],
    action: "block",
    severity: "high",
    enabled: true,
  },
];

// HTTP Protocol Attack Patterns (OWASP CRS 921)
export const PROTOCOL_ATTACK_PATTERNS: WAFRule[] = [
  {
    id: "921100",
    name: "HTTP Request Smuggling Attack",
    description: "Detects HTTP request smuggling attempts",
    pattern:
      /(Transfer-Encoding\s*:\s*(chunked|identity|gzip|compress|deflate)[\s,]*(chunked|identity|gzip|compress|deflate))|(Content-Length\s*:.*Content-Length\s*:)/gi,
    locations: ["headers"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "921110",
    name: "HTTP Response Splitting Attack",
    description: "Detects HTTP response splitting attempts",
    pattern: /(\r\n|\n|\r)(Set-Cookie|Location|Content-Type)\s*:/gi,
    locations: ["body", "query", "headers"],
    action: "block",
    severity: "critical",
    enabled: true,
  },
  {
    id: "921120",
    name: "HTTP Header Injection Attack",
    description: "Detects HTTP header injection via CRLF",
    pattern: /(%0d%0a|%0a|%0d|\r\n|\n|\r)[\w-]+\s*:/gi,
    locations: ["query", "headers"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "921130",
    name: "HTTP Protocol Violation",
    description: "Detects HTTP protocol violations",
    pattern: /(HTTP\/[\d.]+.*HTTP\/[\d.]+)/gi,
    locations: ["headers"],
    action: "block",
    severity: "medium",
    enabled: true,
  },
];

// Bot Detection Patterns
export const BOT_DETECTION_PATTERNS: WAFRule[] = [
  {
    id: "BOT100",
    name: "Known Malicious Bot User-Agent",
    description: "Detects known malicious bot user agents",
    pattern:
      /(sqlmap|nikto|nmap|masscan|zgrab|burp|hydra|medusa|gobuster|dirbuster|wfuzz|ffuf|nuclei|acunetix|netsparker|qualys|w3af|skipfish)/gi,
    locations: ["headers"],
    action: "block",
    severity: "high",
    enabled: true,
  },
  {
    id: "BOT110",
    name: "Missing User-Agent Header",
    description: "Detects requests without User-Agent header",
    pattern: /^$/,
    locations: ["headers"],
    action: "log",
    severity: "low",
    enabled: true,
  },
  {
    id: "BOT120",
    name: "Suspicious Automated Request Pattern",
    description: "Detects automated request patterns",
    pattern: /(curl\/|wget\/|python-requests|go-http-client|java\/|php\/)/gi,
    locations: ["headers"],
    action: "log",
    severity: "low",
    enabled: true,
  },
];

// ============================================================================
// Rule Categories for pattern-based checks
// ============================================================================

export const RULE_CATEGORIES: RuleCategory[] = [
  {
    rules: SQL_INJECTION_PATTERNS,
    eventType: "SQL_INJECTION",
    configKey: "sqlInjection",
  },
  { rules: XSS_PATTERNS, eventType: "XSS_ATTACK", configKey: "xss" },
  {
    rules: COMMAND_INJECTION_PATTERNS,
    eventType: "COMMAND_INJECTION",
    configKey: "commandInjection",
  },
  {
    rules: PATH_TRAVERSAL_PATTERNS,
    eventType: "PATH_TRAVERSAL",
    configKey: "pathTraversal",
  },
  {
    rules: PROTOCOL_ATTACK_PATTERNS,
    eventType: "PROTOCOL_ATTACK",
    configKey: "protocolAttack",
  },
  {
    rules: BOT_DETECTION_PATTERNS,
    eventType: "BOT_DETECTED",
    configKey: "botProtection",
  },
];

// Export all patterns for testing
export const WAF_PATTERNS = {
  SQL_INJECTION: SQL_INJECTION_PATTERNS,
  XSS: XSS_PATTERNS,
  COMMAND_INJECTION: COMMAND_INJECTION_PATTERNS,
  PATH_TRAVERSAL: PATH_TRAVERSAL_PATTERNS,
  PROTOCOL_ATTACK: PROTOCOL_ATTACK_PATTERNS,
  BOT_DETECTION: BOT_DETECTION_PATTERNS,
};
