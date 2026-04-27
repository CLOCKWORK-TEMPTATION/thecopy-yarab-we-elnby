import { env } from '@/config/env';

export function resolveTrustProxySetting(): boolean | number | string {
  const configuredValue = process.env['TRUST_PROXY']?.trim();

  if (!configuredValue) {
    return env.NODE_ENV === 'production' ? 1 : false;
  }

  if (configuredValue === 'true') {
    return true;
  }

  if (configuredValue === 'false') {
    return false;
  }

  const numericValue = Number(configuredValue);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return configuredValue;
}
