/**
 * CANONICAL ENVIRONMENT RESOLVER
 *
 * Single source of truth for runtime environment detection.
 * Uses NEXT_PUBLIC_ENVIRONMENT, NOT NODE_ENV.
 *
 * Valid environments:
 * - dev: Local development
 * - test: Staging/testing (current Vercel deployment)
 * - beta: Pre-production
 * - prod: Production
 */

export type Environment = 'dev' | 'test' | 'beta' | 'prod';

/**
 * Get current runtime environment
 *
 * Priority:
 * 1. NEXT_PUBLIC_ENVIRONMENT (explicit)
 * 2. Default to 'test' (safe default)
 *
 * NEVER use NODE_ENV for business logic.
 */
export function getRuntimeEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;

  // Validate and return
  if (env === 'dev' || env === 'test' || env === 'beta' || env === 'prod') {
    return env;
  }

  // Safe default: test
  // Prevents accidental prod behavior in unconfigured environments
  console.warn(
    `[Environment] NEXT_PUBLIC_ENVIRONMENT not set or invalid (got: ${env}). Defaulting to 'test'.`
  );
  return 'test';
}

/**
 * Check if current environment matches expected
 */
export function isEnvironment(expected: Environment): boolean {
  return getRuntimeEnvironment() === expected;
}

/**
 * Check if current environment is production
 */
export function isProduction(): boolean {
  return getRuntimeEnvironment() === 'prod';
}

/**
 * Check if current environment is NOT production
 */
export function isNonProduction(): boolean {
  return !isProduction();
}

/**
 * Get environment display name
 */
export function getEnvironmentName(): string {
  const env = getRuntimeEnvironment();
  const names: Record<Environment, string> = {
    dev: 'Development',
    test: 'Testing/Staging',
    beta: 'Beta/Pre-Production',
    prod: 'Production',
  };
  return names[env];
}

/**
 * Get environment order (for comparison)
 * dev=1, test=2, beta=3, prod=4
 */
export function getEnvironmentOrder(env: Environment): number {
  const order: Record<Environment, number> = {
    dev: 1,
    test: 2,
    beta: 3,
    prod: 4,
  };
  return order[env];
}

/**
 * Check if environment A is higher than environment B
 *
 * Example: isEnvironmentHigher('prod', 'test') => true
 */
export function isEnvironmentHigher(
  envA: Environment,
  envB: Environment
): boolean {
  return getEnvironmentOrder(envA) > getEnvironmentOrder(envB);
}
