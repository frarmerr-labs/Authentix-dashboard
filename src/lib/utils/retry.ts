/**
 * Retry utility with exponential backoff
 * Used for resilient API calls that may need time to become available
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: ["PROFILE_NOT_READY", "NETWORK_ERROR", "TIMEOUT"],
  retryableStatusCodes: [404, 500, 503],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on options
 */
function isRetryableError(
  error: unknown,
  options: Required<RetryOptions>
): boolean {
  // Check if it's a ServerApiError with retryable code
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (options.retryableErrors.includes(error.code)) {
      return true;
    }
  }

  // Check if it's a ServerApiError with retryable status code
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    if (options.retryableStatusCodes.includes(error.status)) {
      return true;
    }
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function call
 * @throws Last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await sleep(Math.min(delay, opts.maxDelayMs));
      delay *= opts.backoffMultiplier;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
