var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { AnafApiError, AnafAuthenticationError, AnafNotFoundError, AnafValidationError } from '../errors';
import { tryCatch } from '../tryCatch';
/**
 * Simple HTTP client wrapper around native fetch
 * Provides timeout handling, status checking, and response type parsing
 */
export class HttpClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || '';
        this.defaultTimeout = config.timeout || 30000;
    }
    /**
     * Make HTTP request with timeout and error handling
     */
    async request(url, options = {}) {
        const { timeout = this.defaultTimeout, baseURL } = options, fetchOptions = __rest(options, ["timeout", "baseURL"]);
        // Build full URL
        const fullUrl = baseURL || this.baseURL ? new URL(url, baseURL || this.baseURL).toString() : url;
        // Setup timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const { data, error } = tryCatch(async () => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[HTTP] ${fetchOptions.method || 'GET'} ${fullUrl}`);
            }
            const response = await fetch(fullUrl, Object.assign(Object.assign({}, fetchOptions), { signal: controller.signal }));
            clearTimeout(timeoutId);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[HTTP] Response ${response.status} for ${fullUrl}`);
            }
            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                this.handleHttpError(response.status, response.statusText, errorText);
            }
            // Parse response based on content type
            const data = await this.parseResponse(response);
            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            };
        });
        if (error) {
            clearTimeout(timeoutId);
            if ((error === null || error === void 0 ? void 0 : error.name) === 'AbortError') {
                throw new AnafApiError('Request timeout');
            }
            // Re-throw our custom errors
            if (error instanceof AnafApiError ||
                error instanceof AnafAuthenticationError ||
                error instanceof AnafValidationError) {
                throw error;
            }
            throw new AnafApiError(`Network error: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
        }
        return data;
    }
    /**
     * GET request
     */
    async get(url, options = {}) {
        return this.request(url, Object.assign(Object.assign({}, options), { method: 'GET' }));
    }
    /**
     * POST request
     */
    async post(url, body, options = {}) {
        const requestOptions = Object.assign(Object.assign({}, options), { method: 'POST' });
        if (body !== undefined) {
            if (typeof body === 'string') {
                requestOptions.body = body;
            }
            else if (body instanceof FormData) {
                requestOptions.body = body;
                // Don't set Content-Type for FormData - browser will set it with boundary
            }
            else {
                requestOptions.body = JSON.stringify(body);
                requestOptions.headers = Object.assign({ 'Content-Type': 'application/json' }, requestOptions.headers);
            }
        }
        return this.request(url, requestOptions);
    }
    /**
     * Parse response based on content type or explicit type
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        // For ArrayBuffer responses (PDF files)
        if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
            return response.arrayBuffer();
        }
        // For JSON responses
        if (contentType.includes('application/json')) {
            return response.json();
        }
        // Default to text
        return response.text();
    }
    /**
     * Handle HTTP error status codes
     */
    handleHttpError(status, statusText, errorText) {
        const message = `HTTP ${status}: ${statusText}${errorText ? ` - ${errorText}` : ''}`;
        if (status === 401 || status === 403) {
            throw new AnafAuthenticationError(message);
        }
        else if (status === 404) {
            throw new AnafNotFoundError(message);
        }
        else if (status >= 400 && status < 500) {
            throw new AnafValidationError(message);
        }
        else {
            throw new AnafApiError(message, status, errorText);
        }
    }
}
//# sourceMappingURL=httpClient.js.map