"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnafUnexpectedResponseError = exports.AnafXmlParsingError = exports.AnafApiError = exports.AnafAuthenticationError = exports.AnafNotFoundError = exports.AnafValidationError = exports.AnafSdkError = void 0;
class AnafSdkError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, AnafSdkError.prototype);
    }
}
exports.AnafSdkError = AnafSdkError;
class AnafValidationError extends AnafSdkError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, AnafValidationError.prototype);
    }
}
exports.AnafValidationError = AnafValidationError;
class AnafNotFoundError extends AnafSdkError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, AnafNotFoundError.prototype);
    }
}
exports.AnafNotFoundError = AnafNotFoundError;
class AnafAuthenticationError extends AnafSdkError {
    constructor(message = 'Authentication failed. Check your credentials or token.') {
        super(message);
        Object.setPrototypeOf(this, AnafAuthenticationError.prototype);
    }
}
exports.AnafAuthenticationError = AnafAuthenticationError;
class AnafApiError extends AnafSdkError {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AnafApiError.prototype);
    }
}
exports.AnafApiError = AnafApiError;
class AnafXmlParsingError extends AnafSdkError {
    constructor(message, rawResponse) {
        super(message);
        this.rawResponse = rawResponse;
        Object.setPrototypeOf(this, AnafXmlParsingError.prototype);
    }
}
exports.AnafXmlParsingError = AnafXmlParsingError;
class AnafUnexpectedResponseError extends AnafSdkError {
    constructor(message = 'The API returned an unexpected response format.', responseData) {
        super(message);
        this.responseData = responseData;
        Object.setPrototypeOf(this, AnafUnexpectedResponseError.prototype);
    }
}
exports.AnafUnexpectedResponseError = AnafUnexpectedResponseError;
