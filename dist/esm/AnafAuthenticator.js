import { AnafAuthenticationError, AnafValidationError } from './errors';
import { OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL } from './constants';
import { buildOAuthAuthorizationUrl, encodeOAuthTokenRequest } from './utils/formEncoder';
import { HttpClient } from './utils/httpClient';
import { tryCatch } from './tryCatch';
/**
 * Handles OAuth 2.0 authentication with ANAF e-Factura
 */
export class AnafAuthenticator {
    constructor(config) {
        var _a;
        this.validateConfig(config);
        this.config = Object.assign(Object.assign({}, config), { timeout: (_a = config.timeout) !== null && _a !== void 0 ? _a : 30000 });
        this.httpClient = new HttpClient({
            timeout: this.config.timeout,
        });
    }
    /**
     * Generate OAuth authorization URL for user authentication
     */
    getAuthorizationUrl(scope) {
        return buildOAuthAuthorizationUrl(OAUTH_AUTHORIZE_URL, {
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri,
            token_content_type: 'jwt',
            scope,
        });
    }
    /**
     * Exchange authorization code for access and refresh tokens
     */
    async exchangeCodeForToken(code) {
        if (!(code === null || code === void 0 ? void 0 : code.trim())) {
            throw new AnafValidationError('Authorization code is required');
        }
        const formData = encodeOAuthTokenRequest({
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri,
            code,
            token_content_type: 'jwt',
        });
        const { data, error } = tryCatch(async () => {
            var _a;
            const response = await this.httpClient.post(OAUTH_TOKEN_URL, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.access_token)) {
                throw new AnafAuthenticationError('Token response missing access token');
            }
            return response.data;
        });
        if (error) {
            throw new AnafAuthenticationError('Failed to exchange authorization code for tokens');
        }
        return data;
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        if (!(refreshToken === null || refreshToken === void 0 ? void 0 : refreshToken.trim())) {
            throw new AnafValidationError('Refresh token is required');
        }
        const formData = encodeOAuthTokenRequest({
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri,
            refresh_token: refreshToken,
            token_content_type: 'jwt',
        });
        const { data, error } = tryCatch(async () => {
            var _a;
            const response = await this.httpClient.post(OAUTH_TOKEN_URL, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.access_token)) {
                throw new AnafAuthenticationError('Token response missing access token');
            }
            return response.data;
        });
        if (error) {
            throw new AnafAuthenticationError('Failed to refresh access token');
        }
        return data;
    }
    validateConfig(config) {
        var _a, _b, _c;
        if (!config) {
            throw new AnafValidationError('Configuration is required');
        }
        if (!((_a = config.clientId) === null || _a === void 0 ? void 0 : _a.trim())) {
            throw new AnafValidationError('OAuth client ID is required');
        }
        if (!((_b = config.clientSecret) === null || _b === void 0 ? void 0 : _b.trim())) {
            throw new AnafValidationError('OAuth client secret is required');
        }
        if (!((_c = config.redirectUri) === null || _c === void 0 ? void 0 : _c.trim())) {
            throw new AnafValidationError('OAuth redirect URI is required');
        }
    }
}
//# sourceMappingURL=AnafAuthenticator.js.map