import { AnafAuthConfig, TokenResponse } from './types';
/**
 * Handles OAuth 2.0 authentication with ANAF e-Factura
 */
export declare class AnafAuthenticator {
    private config;
    private httpClient;
    constructor(config: AnafAuthConfig);
    /**
     * Generate OAuth authorization URL for user authentication
     */
    getAuthorizationUrl(scope?: string): string;
    /**
     * Exchange authorization code for access and refresh tokens
     */
    exchangeCodeForToken(code: string): Promise<TokenResponse>;
    /**
     * Refresh access token using refresh token
     */
    refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
    private validateConfig;
}
