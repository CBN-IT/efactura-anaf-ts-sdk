"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const errors_1 = require("../errors");
const tryCatch_1 = require("../tryCatch");
/**
 * Simple HTTP client wrapper around native fetch
 * Provides timeout handling, status checking, and response type parsing
 */
class HttpClient {
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
        const { data, error } = (0, tryCatch_1.tryCatch)(async () => {
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
                throw new errors_1.AnafApiError('Request timeout');
            }
            // Re-throw our custom errors
            if (error instanceof errors_1.AnafApiError ||
                error instanceof errors_1.AnafAuthenticationError ||
                error instanceof errors_1.AnafValidationError) {
                throw error;
            }
            throw new errors_1.AnafApiError(`Network error: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
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
        console.log("!!!"+contentType)

        // For ArrayBuffer responses (PDF files)
        if (contentType.includes('application/pdf') ||
            contentType.includes('application/octet-stream')) {

            return response.arrayBuffer();
        }

        // For JSON responses
        if (contentType.includes('application/json')) {
            return response.json();
        }
        if (contentType.includes('application/zip')) {
            return response.arrayBuffer();
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
            throw new errors_1.AnafAuthenticationError(message);
        }
        else if (status === 404) {
            throw new errors_1.AnafNotFoundError(message);
        }
        else if (status >= 400 && status < 500) {
            throw new errors_1.AnafValidationError(message);
        }
        else {
            throw new errors_1.AnafApiError(message, status, errorText);
        }
    }
}
exports.HttpClient = HttpClient;
