/**
 * Redis Gate - single source of truth for Redis availability decisions
 */

export function isRedisEnabled(): boolean {
  const flag = (process.env['REDIS_ENABLED'] ?? '').trim().toLowerCase();
  // Explicit false disables Redis entirely
  if (flag === 'false') return false;
  // Must have connection info
  return Boolean(process.env.REDIS_URL?.trim()) || Boolean(process.env.REDIS_HOST?.trim());
}

export function getRedisRequirementReason(): string {
  if (!isRedisEnabled()) {
    return 'Redis is disabled (REDIS_ENABLED=false or no connection config)';
  }
  return 'Redis is enabled and required';
}
