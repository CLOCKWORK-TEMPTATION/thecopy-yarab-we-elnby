import moduleAlias from 'module-alias';
import path from 'node:path';

export type RuntimeAliasRegistration = {
  shouldRegister: boolean;
  baseDir: string | null;
};

export function resolveRuntimeAliasRegistration(currentDir = __dirname): RuntimeAliasRegistration {
  const normalizedDir = path.resolve(currentDir);
  const pathSegments = normalizedDir.split(path.sep);
  const distIndex = pathSegments.lastIndexOf('dist');

  if (distIndex === -1) {
    return {
      shouldRegister: false,
      baseDir: null,
    };
  }

  return {
    shouldRegister: true,
    baseDir: pathSegments.slice(0, distIndex + 1).join(path.sep),
  };
}

let aliasesRegistered = false;

export function registerRuntimeAliases(currentDir = __dirname): RuntimeAliasRegistration {
  const registration = resolveRuntimeAliasRegistration(currentDir);

  if (!registration.shouldRegister || !registration.baseDir || aliasesRegistered) {
    return registration;
  }

  moduleAlias.addAliases({
    '@': registration.baseDir,
    '@core': path.join(registration.baseDir, 'services', 'agents', 'core'),
  });

  aliasesRegistered = true;
  return registration;
}

registerRuntimeAliases();
