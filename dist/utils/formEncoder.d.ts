/**
 * Form encoding utilities for ANAF e-Factura SDK
 *
 * Provides consistent form encoding for OAuth and other
 * form-based API requests.
 */
/**
 * Encode object as application/x-www-form-urlencoded string
 * @param data Object to encode
 * @returns Encoded form string
 */
export declare function encodeForm(data: Record<string, string | number | boolean>): string;
/**
 * Build query string from object
 * @param obj Object to convert to query string
 * @returns Query string (without leading ?)
 */
export declare function buildQueryString(obj: Record<string, unknown>): string;
/**
 * Encode OAuth token request data
 * @param params OAuth parameters
 * @returns Encoded form data
 */
export declare function encodeOAuthTokenRequest(params: {
    grant_type: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    code?: string;
    refresh_token?: string;
    token_content_type?: string;
}): string;
/**
 * Build OAuth authorization URL
 * @param baseUrl Authorization endpoint base URL
 * @param params Authorization parameters
 * @returns Complete authorization URL
 */
export declare function buildOAuthAuthorizationUrl(baseUrl: string, params: {
    client_id: string;
    response_type: string;
    redirect_uri: string;
    scope?: string;
    token_content_type?: string;
}): string;
/**
 * Extract OAuth code from redirect URL
 * @param redirectUrl Full redirect URL containing code parameter
 * @returns Authorization code or null if not found
 */
export declare function extractOAuthCode(redirectUrl: string): string | null;
/**
 * Extract OAuth error from redirect URL
 * @param redirectUrl Full redirect URL that might contain error
 * @returns Error information or null if no error
 */
export declare function extractOAuthError(redirectUrl: string): {
    error: string;
    error_description?: string;
} | null;
