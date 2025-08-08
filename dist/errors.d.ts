export declare class AnafSdkError extends Error {
    constructor(message: string);
}
export declare class AnafValidationError extends AnafSdkError {
    constructor(message: string);
}
export declare class AnafNotFoundError extends AnafSdkError {
    constructor(message: string);
}
export declare class AnafAuthenticationError extends AnafSdkError {
    constructor(message?: string);
}
export declare class AnafApiError extends AnafSdkError {
    statusCode?: number;
    details?: any;
    constructor(message: string, statusCode?: number, details?: any);
}
export declare class AnafXmlParsingError extends AnafSdkError {
    rawResponse?: string;
    constructor(message: string, rawResponse?: string);
}
export declare class AnafUnexpectedResponseError extends AnafSdkError {
    responseData?: any;
    constructor(message?: string, responseData?: any);
}
