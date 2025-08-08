"use strict";
/**
 * ANAF e-Factura API Constants
 *
 * This file contains all the endpoints and configuration constants
 * for interacting with the Romanian ANAF e-Factura system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginatedMessagesParams = exports.buildListMessagesParams = exports.buildDownloadParams = exports.buildStatusParams = exports.buildUploadParams = exports.getBasePath = exports.INVOICE_TYPE_CODE = exports.UBL_CUSTOMIZATION_ID = exports.DEFAULT_UNIT_CODE = exports.DEFAULT_COUNTRY_CODE = exports.DEFAULT_CURRENCY = exports.DEFAULT_TIMEOUT = exports.VALIDATE_SIGNATURE_CERT_URL = exports.VALIDATE_SIGNATURE_OAUTH_URL = exports.XML_TO_PDF_CERT_URL = exports.XML_TO_PDF_OAUTH_URL = exports.VALIDATE_XML_CERT_URL = exports.VALIDATE_XML_OAUTH_URL = exports.LIST_MESSAGES_PAGINATED_PATH = exports.LIST_MESSAGES_PATH = exports.DOWNLOAD_PATH = exports.STATUS_MESSAGE_PATH = exports.UPLOAD_B2C_PATH = exports.UPLOAD_PATH = exports.OAUTH_TOKEN_URL = exports.OAUTH_AUTHORIZE_URL = exports.BASE_PATH_CERT_PROD = exports.BASE_PATH_CERT_TEST = exports.BASE_PATH_OAUTH_PROD = exports.BASE_PATH_OAUTH_TEST = void 0;
// =============================================================================
// Base API Paths
// =============================================================================
/**
 * OAuth-based API endpoints (recommended)
 */
exports.BASE_PATH_OAUTH_TEST = 'https://api.anaf.ro/test/FCTEL/rest/';
exports.BASE_PATH_OAUTH_PROD = 'https://api.anaf.ro/prod/FCTEL/rest/';
/**
 * Certificate-based API endpoints
 */
exports.BASE_PATH_CERT_TEST = 'https://webserviceapl.anaf.ro/test/FCTEL/rest/';
exports.BASE_PATH_CERT_PROD = 'https://webserviceapl.anaf.ro/prod/FCTEL/rest/';
// =============================================================================
// OAuth 2.0 Authentication Endpoints
// =============================================================================
/**
 * OAuth authorization endpoint
 * Used to initiate the OAuth flow and obtain authorization code
 */
exports.OAUTH_AUTHORIZE_URL = 'https://logincert.anaf.ro/anaf-oauth2/v1/authorize';
/**
 * OAuth token endpoint
 * Used to exchange authorization code for access token and refresh tokens
 */
exports.OAUTH_TOKEN_URL = 'https://logincert.anaf.ro/anaf-oauth2/v1/token';
// =============================================================================
// Core e-Factura API Endpoints (relative paths)
// =============================================================================
/**
 * Upload invoice document
 * POST {basePath}/upload?standard={UBL|CN|CII|RASP}&cif={vatNumber}
 * Optional params: extern, autofactura, executare
 */
exports.UPLOAD_PATH = 'upload';
/**
 * Upload B2C (Business to Consumer) invoice
 * POST {basePath}/uploadb2c?cif={vatNumber}
 * Used for simplified B2C invoices
 */
exports.UPLOAD_B2C_PATH = 'uploadb2c';
/**
 * Check upload status
 * GET {basePath}/stareMesaj?id_incarcare={uploadId}
 * Returns current processing status of uploaded document
 */
exports.STATUS_MESSAGE_PATH = 'stareMesaj';
/**
 * Download processed document
 * GET {basePath}/descarcare?id={downloadId}
 * Downloads the processed invoice or error details
 */
exports.DOWNLOAD_PATH = 'descarcare';
/**
 * List messages (simple)
 * GET {basePath}/listaMesajeFactura?zile={days}&cif={vatNumber}
 * Optional param: filtru={E|T|P|R}
 */
exports.LIST_MESSAGES_PATH = 'listaMesajeFactura';
/**
 * List messages with pagination
 * GET {basePath}/listaMesajePaginatieFactura?startTime={timestamp}&endTime={timestamp}&pagina={page}&cif={vatNumber}
 * Optional param: filtru={E|T|P|R}
 */
exports.LIST_MESSAGES_PAGINATED_PATH = 'listaMesajePaginatieFactura';
// =============================================================================
// Validation and Conversion Endpoints
// =============================================================================
/**
 * XML validation endpoint for OAuth
 * POST https://api.anaf.ro/prod/FCTEL/rest/validare
 * Validates XML documents against ANAF schemas
 */
exports.VALIDATE_XML_OAUTH_URL = 'https://api.anaf.ro/prod/FCTEL/rest/validare';
/**
 * XML validation endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare
 */
exports.VALIDATE_XML_CERT_URL = 'https://webservicesp.anaf.ro/prod/FCTEL/rest/validare';
/**
 * XML to PDF conversion endpoint for OAuth
 * POST https://api.anaf.ro/prod/FCTEL/rest/transformare/{standard}[/DA]
 * Converts e-Factura XML to PDF format
 */
exports.XML_TO_PDF_OAUTH_URL = 'https://api.anaf.ro/prod/FCTEL/rest/transformare';
/**
 * XML to PDF conversion endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/prod/FCTEL/rest/transformare/{standard}[/DA]
 */
exports.XML_TO_PDF_CERT_URL = 'https://webservicesp.anaf.ro/prod/FCTEL/rest/transformare';
/**
 * Digital signature validation endpoint for OAuth
 * POST https://api.anaf.ro/api/validate/signature
 * Validates digital signatures on XML documents
 */
exports.VALIDATE_SIGNATURE_OAUTH_URL = 'https://api.anaf.ro/api/validate/signature';
/**
 * Digital signature validation endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/api/validate/signature
 */
exports.VALIDATE_SIGNATURE_CERT_URL = 'https://webservicesp.anaf.ro/api/validate/signature';
// =============================================================================
// Default Configuration Values
// =============================================================================
/**
 * Default request timeout in milliseconds
 */
exports.DEFAULT_TIMEOUT = 30000;
/**
 * Default currency for invoices
 */
exports.DEFAULT_CURRENCY = 'RON';
/**
 * Default country code for addresses
 */
exports.DEFAULT_COUNTRY_CODE = 'RO';
/**
 * Default unit of measure code
 */
exports.DEFAULT_UNIT_CODE = 'EA'; // Each
/**
 * UBL customization ID for CIUS-RO compliance
 */
exports.UBL_CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1';
/**
 * Default invoice type code (Commercial Invoice)
 */
exports.INVOICE_TYPE_CODE = '380';
// =============================================================================
// Helper Functions for URL Construction
// =============================================================================
/**
 * Get the appropriate base path based on auth mode and environment
 */
const getBasePath = (authMode = 'oauth', testMode = false) => {
    if (authMode === 'cert') {
        return testMode ? exports.BASE_PATH_CERT_TEST : exports.BASE_PATH_CERT_PROD;
    }
    return testMode ? exports.BASE_PATH_OAUTH_TEST : exports.BASE_PATH_OAUTH_PROD;
};
exports.getBasePath = getBasePath;
// =============================================================================
// Query Parameter Builders
// =============================================================================
/**
 * Build upload query parameters
 */
const buildUploadParams = (vatNumber, options = {}) => {
    const params = new URLSearchParams();
    params.append('cif', vatNumber);
    params.append('standard', options.standard || 'UBL');
    if (options.extern)
        params.append('extern', 'DA');
    if (options.autofactura)
        params.append('autofactura', 'DA');
    if (options.executare)
        params.append('executare', 'DA');
    return params;
};
exports.buildUploadParams = buildUploadParams;
/**
 * Build status check query parameters
 */
const buildStatusParams = (uploadId) => {
    const params = new URLSearchParams();
    params.append('id_incarcare', uploadId);
    return params;
};
exports.buildStatusParams = buildStatusParams;
/**
 * Build download query parameters
 */
const buildDownloadParams = (downloadId) => {
    const params = new URLSearchParams();
    params.append('id', downloadId);
    return params;
};
exports.buildDownloadParams = buildDownloadParams;
/**
 * Build list messages query parameters
 */
const buildListMessagesParams = (vatNumber, days, filter) => {
    const params = new URLSearchParams();
    params.append('cif', vatNumber);
    params.append('zile', days.toString());
    if (filter)
        params.append('filtru', filter);
    return params;
};
exports.buildListMessagesParams = buildListMessagesParams;
/**
 * Build paginated list messages query parameters
 */
const buildPaginatedMessagesParams = (vatNumber, startTime, endTime, page, filter) => {
    const params = new URLSearchParams();
    params.append('cif', vatNumber);
    params.append('startTime', startTime.toString());
    params.append('endTime', endTime.toString());
    params.append('pagina', page.toString());
    if (filter)
        params.append('filtru', filter);
    return params;
};
exports.buildPaginatedMessagesParams = buildPaginatedMessagesParams;
