/**
 * ANAF e-Factura API Constants
 *
 * This file contains all the endpoints and configuration constants
 * for interacting with the Romanian ANAF e-Factura system.
 */
import { StandardType } from './types';
/**
 * OAuth-based API endpoints (recommended)
 */
export declare const BASE_PATH_OAUTH_TEST = "https://api.anaf.ro/test/FCTEL/rest/";
export declare const BASE_PATH_OAUTH_PROD = "https://api.anaf.ro/prod/FCTEL/rest/";
/**
 * Certificate-based API endpoints
 */
export declare const BASE_PATH_CERT_TEST = "https://webserviceapl.anaf.ro/test/FCTEL/rest/";
export declare const BASE_PATH_CERT_PROD = "https://webserviceapl.anaf.ro/prod/FCTEL/rest/";
/**
 * OAuth authorization endpoint
 * Used to initiate the OAuth flow and obtain authorization code
 */
export declare const OAUTH_AUTHORIZE_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/authorize";
/**
 * OAuth token endpoint
 * Used to exchange authorization code for access token and refresh tokens
 */
export declare const OAUTH_TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token";
/**
 * Upload invoice document
 * POST {basePath}/upload?standard={UBL|CN|CII|RASP}&cif={vatNumber}
 * Optional params: extern, autofactura, executare
 */
export declare const UPLOAD_PATH = "upload";
/**
 * Upload B2C (Business to Consumer) invoice
 * POST {basePath}/uploadb2c?cif={vatNumber}
 * Used for simplified B2C invoices
 */
export declare const UPLOAD_B2C_PATH = "uploadb2c";
/**
 * Check upload status
 * GET {basePath}/stareMesaj?id_incarcare={uploadId}
 * Returns current processing status of uploaded document
 */
export declare const STATUS_MESSAGE_PATH = "stareMesaj";
/**
 * Download processed document
 * GET {basePath}/descarcare?id={downloadId}
 * Downloads the processed invoice or error details
 */
export declare const DOWNLOAD_PATH = "descarcare";
/**
 * List messages (simple)
 * GET {basePath}/listaMesajeFactura?zile={days}&cif={vatNumber}
 * Optional param: filtru={E|T|P|R}
 */
export declare const LIST_MESSAGES_PATH = "listaMesajeFactura";
/**
 * List messages with pagination
 * GET {basePath}/listaMesajePaginatieFactura?startTime={timestamp}&endTime={timestamp}&pagina={page}&cif={vatNumber}
 * Optional param: filtru={E|T|P|R}
 */
export declare const LIST_MESSAGES_PAGINATED_PATH = "listaMesajePaginatieFactura";
/**
 * XML validation endpoint for OAuth
 * POST https://api.anaf.ro/prod/FCTEL/rest/validare
 * Validates XML documents against ANAF schemas
 */
export declare const VALIDATE_XML_OAUTH_URL = "https://api.anaf.ro/prod/FCTEL/rest/validare";
/**
 * XML validation endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare
 */
export declare const VALIDATE_XML_CERT_URL = "https://webservicesp.anaf.ro/prod/FCTEL/rest/validare";
/**
 * XML to PDF conversion endpoint for OAuth
 * POST https://api.anaf.ro/prod/FCTEL/rest/transformare/{standard}[/DA]
 * Converts e-Factura XML to PDF format
 */
export declare const XML_TO_PDF_OAUTH_URL = "https://api.anaf.ro/prod/FCTEL/rest/transformare";
/**
 * XML to PDF conversion endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/prod/FCTEL/rest/transformare/{standard}[/DA]
 */
export declare const XML_TO_PDF_CERT_URL = "https://webservicesp.anaf.ro/prod/FCTEL/rest/transformare";
/**
 * Digital signature validation endpoint for OAuth
 * POST https://api.anaf.ro/api/validate/signature
 * Validates digital signatures on XML documents
 */
export declare const VALIDATE_SIGNATURE_OAUTH_URL = "https://api.anaf.ro/api/validate/signature";
/**
 * Digital signature validation endpoint for Certificate auth
 * POST https://webservicesp.anaf.ro/api/validate/signature
 */
export declare const VALIDATE_SIGNATURE_CERT_URL = "https://webservicesp.anaf.ro/api/validate/signature";
/**
 * Default request timeout in milliseconds
 */
export declare const DEFAULT_TIMEOUT = 30000;
/**
 * Default currency for invoices
 */
export declare const DEFAULT_CURRENCY = "RON";
/**
 * Default country code for addresses
 */
export declare const DEFAULT_COUNTRY_CODE = "RO";
/**
 * Default unit of measure code
 */
export declare const DEFAULT_UNIT_CODE = "EA";
/**
 * UBL customization ID for CIUS-RO compliance
 */
export declare const UBL_CUSTOMIZATION_ID = "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1";
/**
 * Default invoice type code (Commercial Invoice)
 */
export declare const INVOICE_TYPE_CODE = "380";
/**
 * Get the appropriate base path based on auth mode and environment
 */
export declare const getBasePath: (authMode?: "oauth" | "cert", testMode?: boolean) => string;
/**
 * Build upload query parameters
 */
export declare const buildUploadParams: (vatNumber: string, options?: {
    standard?: StandardType;
    extern?: boolean;
    autofactura?: boolean;
    executare?: boolean;
}) => URLSearchParams;
/**
 * Build status check query parameters
 */
export declare const buildStatusParams: (uploadId: string) => URLSearchParams;
/**
 * Build download query parameters
 */
export declare const buildDownloadParams: (downloadId: string) => URLSearchParams;
/**
 * Build list messages query parameters
 */
export declare const buildListMessagesParams: (vatNumber: string, days: number, filter?: string) => URLSearchParams;
/**
 * Build paginated list messages query parameters
 */
export declare const buildPaginatedMessagesParams: (vatNumber: string, startTime: number, endTime: number, page: number, filter?: string) => URLSearchParams;
