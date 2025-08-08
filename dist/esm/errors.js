export class AnafSdkError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, AnafSdkError.prototype);
    }
}
export class AnafValidationError extends AnafSdkError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, AnafValidationError.prototype);
    }
}
export class AnafNotFoundError extends AnafSdkError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, AnafNotFoundError.prototype);
    }
}
export class AnafAuthenticationError extends AnafSdkError {
    constructor(message = 'Authentication failed. Check your credentials or token.') {
        super(message);
        Object.setPrototypeOf(this, AnafAuthenticationError.prototype);
    }
}
export class AnafApiError extends AnafSdkError {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AnafApiError.prototype);
    }
}
export class AnafXmlParsingError extends AnafSdkError {
    constructor(message, rawResponse) {
        super(message);
        this.rawResponse = rawResponse;
        Object.setPrototypeOf(this, AnafXmlParsingError.prototype);
    }
}
export class AnafUnexpectedResponseError extends AnafSdkError {
    constructor(message = 'The API returned an unexpected response format.', responseData) {
        super(message);
        this.responseData = responseData;
        Object.setPrototypeOf(this, AnafUnexpectedResponseError.prototype);
    }
}
//# sourceMappingURL=errors.js.map