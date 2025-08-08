"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUploadResponse = parseUploadResponse;
exports.parseStatusResponse = parseStatusResponse;
exports.parseJsonResponse = parseJsonResponse;
exports.isErrorResponse = isErrorResponse;
exports.extractErrorMessage = extractErrorMessage;
exports.parseXmlResponse = parseXmlResponse;
const xmlbuilder2_1 = require("xmlbuilder2");
const types_1 = require("../types");
const errors_1 = require("../errors");
const tryCatch_1 = require("../tryCatch");
/**
 * Parses XML responses from ANAF API
 *
 * ANAF returns XML responses for upload, status check, and some other operations.
 * This utility provides a consistent way to parse these responses and extract
 * the relevant information.
 */
/**
 * Parse XML response from ANAF upload operations
 *
 * Upload success response format:
 * <header ExecutionStatus="0" index_incarcare="3828" dateResponse="202108051140"/>
 *
 * Upload error response format:
 * <header ExecutionStatus="1" dateResponse="202108051144">
 *   <Errors errorMessage="Error message here"/>
 * </header>
 *
 * @param xmlString Raw XML response from ANAF upload operations
 * @returns Parsed upload response object
 * @throws {AnafXmlParsingError} If XML cannot be parsed or has unexpected structure
 */
function parseUploadResponse(xmlString) {
    const { data: doc, error } = (0, tryCatch_1.tryCatch)(() => {
        const grouped = (0, xmlbuilder2_1.create)(xmlString).toObject({ group: true });
        const simple = (0, xmlbuilder2_1.create)(xmlString).toObject();
        return { grouped, simple };
    });
    if (error) {
        throw new errors_1.AnafXmlParsingError('Failed to parse XML response', xmlString);
    }
    // Try to parse using grouped structure first
    let result = tryParseUploadStructure(doc.grouped);
    if (result)
        return result;
    // Fallback to simple structure
    result = tryParseUploadStructure(doc.simple);
    if (result)
        return result;
    throw new errors_1.AnafXmlParsingError('Unknown or unexpected XML response structure', xmlString);
}
/**
 * Try to parse upload XML structure
 */
function tryParseUploadStructure(doc) {
    if (!doc)
        return null;
    const header = doc.header || doc.Header;
    if (!header)
        return null;
    const content = Array.isArray(header) ? header[0] : header;
    const attributes = content['@'] || content;
    // Handle upload responses (have ExecutionStatus attribute)
    if (attributes.ExecutionStatus !== undefined) {
        const statusValue = Number(attributes.ExecutionStatus);
        const result = {
            executionStatus: statusValue,
            indexIncarcare: attributes.index_incarcare ? String(attributes.index_incarcare) : undefined,
            dateResponse: attributes.dateResponse ? String(attributes.dateResponse) : undefined,
        };
        if (statusValue === types_1.ExecutionStatus.Error) {
            const errorElements = content.Errors ? (Array.isArray(content.Errors) ? content.Errors : [content.Errors]) : [];
            result.errors = errorElements.map((err) => findErrorMessage(err) || '');
        }
        return result;
    }
    return null;
}
/**
 * Parse XML response from ANAF status check operations
 *
 * Status success response format:
 * <header stare="ok" id_descarcare="1234"/>
 * <header stare="in prelucrare"/>
 *
 * Status error response format:
 * <header><Errors errorMessage="Error message"/></header>
 *
 * @param xmlString Raw XML response from ANAF status operations
 * @returns Parsed status response object
 * @throws {AnafXmlParsingError} If XML cannot be parsed or has unexpected structure
 */
function parseStatusResponse(xmlString) {
    const { data: doc, error } = (0, tryCatch_1.tryCatch)(() => {
        const grouped = (0, xmlbuilder2_1.create)(xmlString).toObject({ group: true });
        const simple = (0, xmlbuilder2_1.create)(xmlString).toObject();
        return { grouped, simple };
    });
    if (error) {
        throw new errors_1.AnafXmlParsingError('Failed to parse XML response', xmlString);
    }
    // Try to parse using grouped structure first
    let result = tryParseStatusStructure(doc.grouped);
    if (result)
        return result;
    // Fallback to simple structure
    result = tryParseStatusStructure(doc.simple);
    if (result)
        return result;
    throw new errors_1.AnafXmlParsingError('Unknown or unexpected XML response structure', xmlString);
}
/**
 * Try to parse status XML structure
 */
function tryParseStatusStructure(doc) {
    var _a, _b;
    if (!doc)
        return null;
    // Find the main response element - ANAF uses 'header' element
    const header = doc.header || doc.Header;
    if (!header) {
        return null;
    }
    const content = Array.isArray(header) ? header[0] : header;
    // xmlbuilder2 stores attributes in '@' property when using { group: true }
    const attributes = content['@'] || content;
    // Handle status responses (have stare attribute or id_descarcare)
    if (attributes.stare || attributes.id_descarcare) {
        const result = {};
        if (attributes.stare) {
            result.stare = String(attributes.stare);
        }
        if (attributes.id_descarcare) {
            result.idDescarcare = String(attributes.id_descarcare);
        }
        return result;
    }
    // Handle error responses without ExecutionStatus (status endpoint errors)
    const errors = content.Errors || content.errors || content.Error || content.error;
    if (errors) {
        const errorElements = Array.isArray(errors) ? errors : [errors];
        const errorMessages = errorElements.map((err) => findErrorMessage(err) || 'Operation failed');
        return { errors: errorMessages };
    }
    // Fallback: Try to find other common response structures
    const raspuns = doc.Raspuns || ((_b = (_a = doc.Envelope) === null || _a === void 0 ? void 0 : _a.Body) === null || _b === void 0 ? void 0 : _b.Raspuns) || doc.response || doc.Response;
    if (raspuns) {
        const content = Array.isArray(raspuns) ? raspuns[0] : raspuns;
        // Handle status response (contains id_descarcare and/or stare)
        if (content.id_descarcare || content.stare) {
            return {
                idDescarcare: content.id_descarcare ? extractTextValue(content.id_descarcare) : undefined,
                stare: content.stare ? extractTextValue(content.stare) : undefined,
            };
        }
        // Handle error responses
        if (content.Error || content.eroare) {
            const errorDetail = content.Error || content.eroare;
            const errorMessage = errorDetail.mesaj ? extractTextValue(errorDetail.mesaj) : extractTextValue(errorDetail);
            return { errors: [errorMessage] };
        }
    }
    return null;
}
/**
 * Extract text value from XML element
 * Handles both string values and array structures that xmlbuilder2 might create
 */
function extractTextValue(element) {
    if (typeof element === 'string') {
        return element;
    }
    if (Array.isArray(element) && element.length > 0) {
        return String(element[0]);
    }
    if (typeof element === 'object' && element !== null && element._) {
        return String(element._);
    }
    return String(element);
}
/**
 * Recursively search for errorMessage in an object structure
 * @param obj Object to search in
 * @returns Found error message or null
 */
function findErrorMessage(obj) {
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    // Direct check for errorMessage attribute/property
    if (obj.errorMessage) {
        return String(obj.errorMessage);
    }
    // Check in attributes object
    if (obj['@'] && obj['@'].errorMessage) {
        return String(obj['@'].errorMessage);
    }
    // Search through all properties
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'errorMessage' || key.endsWith('errorMessage')) {
            return String(value);
        }
        // Recursively search in nested objects
        if (typeof value === 'object' && value !== null) {
            const found = findErrorMessage(value);
            if (found) {
                return found;
            }
        }
    }
    return null;
}
/**
 * Parse JSON response from ANAF API
 * Some endpoints return JSON instead of XML
 * @param response Response data that might be JSON
 * @returns Parsed object or throws error
 */
function parseJsonResponse(response) {
    if (typeof response === 'string') {
        const { data, error } = (0, tryCatch_1.tryCatch)(() => {
            return JSON.parse(response);
        });
        if (error) {
            throw new errors_1.AnafXmlParsingError('Failed to parse JSON response', response);
        }
        return data;
    }
    return response;
}
/**
 * Determine if a response is an error based on common ANAF patterns
 * @param response Parsed response object
 * @returns True if response indicates an error
 */
function isErrorResponse(response) {
    return !!((response === null || response === void 0 ? void 0 : response.errors) ||
        (response === null || response === void 0 ? void 0 : response.Error) ||
        (response === null || response === void 0 ? void 0 : response.error) ||
        (response === null || response === void 0 ? void 0 : response.eroare) ||
        (response === null || response === void 0 ? void 0 : response.executionStatus) === types_1.ExecutionStatus.Error ||
        ((response === null || response === void 0 ? void 0 : response.stare) && response.stare.toLowerCase() === 'nok'));
}
/**
 * Extract error message from response
 * @param response Parsed response object
 * @returns Error message or null if no error found
 */
function extractErrorMessage(response) {
    var _a;
    if ((response === null || response === void 0 ? void 0 : response.errors) && Array.isArray(response.errors) && response.errors.length > 0) {
        return response.errors.join('; ');
    }
    if ((_a = response === null || response === void 0 ? void 0 : response.Error) === null || _a === void 0 ? void 0 : _a.mesaj)
        return response.Error.mesaj;
    if (response === null || response === void 0 ? void 0 : response.error)
        return response.error;
    if (response === null || response === void 0 ? void 0 : response.eroare)
        return response.eroare; // Romanian error field used in list API responses
    if ((response === null || response === void 0 ? void 0 : response.mesaj) && (response === null || response === void 0 ? void 0 : response.stare) === 'nok')
        return response.mesaj;
    return null;
}
/**
 * Legacy function for backward compatibility - delegates to appropriate parser
 * @deprecated Use parseUploadResponse or parseStatusResponse instead
 */
function parseXmlResponse(xmlString) {
    // Try to determine response type by looking for ExecutionStatus attribute
    if (xmlString.includes('ExecutionStatus=')) {
        return parseUploadResponse(xmlString);
    }
    else {
        return parseStatusResponse(xmlString);
    }
}
