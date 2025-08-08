import { UploadResponse, StatusResponse } from '../types';
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
export declare function parseUploadResponse(xmlString: string): UploadResponse;
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
export declare function parseStatusResponse(xmlString: string): StatusResponse;
/**
 * Parse JSON response from ANAF API
 * Some endpoints return JSON instead of XML
 * @param response Response data that might be JSON
 * @returns Parsed object or throws error
 */
export declare function parseJsonResponse<T = any>(response: any): T;
/**
 * Determine if a response is an error based on common ANAF patterns
 * @param response Parsed response object
 * @returns True if response indicates an error
 */
export declare function isErrorResponse(response: any): boolean;
/**
 * Extract error message from response
 * @param response Parsed response object
 * @returns Error message or null if no error found
 */
export declare function extractErrorMessage(response: any): string | null;
/**
 * Legacy function for backward compatibility - delegates to appropriate parser
 * @deprecated Use parseUploadResponse or parseStatusResponse instead
 */
export declare function parseXmlResponse(xmlString: string): UploadResponse | StatusResponse;
