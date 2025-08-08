interface HttpOptions extends RequestInit {
    timeout?: number;
    baseURL?: string;
    data?: any;
}
export interface HttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
}
/**
 * Simple HTTP client wrapper around native fetch
 * Provides timeout handling, status checking, and response type parsing
 */
export declare class HttpClient {
    private baseURL;
    private defaultTimeout;
    constructor(config?: {
        baseURL?: string;
        timeout?: number;
    });
    /**
     * Make HTTP request with timeout and error handling
     */
    request<T = any>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;
    /**
     * GET request
     */
    get<T = any>(url: string, options?: HttpOptions): Promise<HttpResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, body?: any, options?: HttpOptions): Promise<HttpResponse<T>>;
    /**
     * Parse response based on content type or explicit type
     */
    private parseResponse;
    /**
     * Handle HTTP error status codes
     */
    private handleHttpError;
}
export {};
