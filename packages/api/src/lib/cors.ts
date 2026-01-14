/**
 * CORS configuration with environment-based origin control
 */

const ALLOWED_ORIGINS = [
  'https://aiscout.photo',
  'https://www.aiscout.photo',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Get the appropriate CORS origin based on the request origin
 * - In development: allows any localhost origin
 * - In production: only allows whitelisted origins
 */
export function getCorsOrigin(requestOrigin: string | undefined): string {
  if (!requestOrigin) {
    return ALLOWED_ORIGINS[0]; // Default to production origin
  }

  // Allow localhost origins in any environment for development
  if (requestOrigin.startsWith('http://localhost:')) {
    return requestOrigin;
  }

  // Check against whitelist
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default to production origin for unknown origins
  return ALLOWED_ORIGINS[0];
}

/**
 * Generate CORS headers for a given request
 */
export function getCorsHeaders(
  requestOrigin: string | undefined,
  methods: string = 'GET, POST, DELETE, OPTIONS'
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}
