import { AnafEfacturaClientConfig, UploadOptions, ListMessagesParams, PaginatedMessagesParams, ListMessagesResponse, PaginatedListMessagesResponse, ValidationResult, DocumentStandardType, UploadResponse, StatusResponse, TokenResponse } from './types';
import { AnafAuthenticator } from './AnafAuthenticator';
/**
 * Main client for interacting with ANAF e-Factura API
 *
 * This client handles automatic token management and all API operations.
 * Both configuration and authenticator are required for initialization.
 *
 * @example
 * ```typescript
 * import { AnafEfacturaClient, AnafAuthenticator } from 'efactura-ts-sdk';
 *
 * // Create authenticator with OAuth credentials
 * const authenticator = new AnafAuthenticator({
 *   clientId: 'your_client_id',
 *   clientSecret: 'your_client_secret',
 *   redirectUri: 'http://localhost:3000/callback',
 *   testMode: true
 * });
 *
 * // Create client with config and authenticator (both required)
 * const client = new AnafEfacturaClient({
 *   vatNumber: 'RO12345678',
 *   testMode: true,
 *   refreshToken: 'your_refresh_token' // obtained from OAuth flow
 * }, authenticator);
 *
 * // Upload document (automatic token management)
 * const uploadResult = await client.uploadDocument(xmlContent);
 *
 * // Check status (automatic token refresh if needed)
 * const status = await client.getUploadStatus(uploadResult.indexIncarcare);
 *
 * // Download processed document
 * if (status.stare === 'ok' && status.idDescarcare) {
 *   const document = await client.downloadDocument(status.idDescarcare);
 * }
 * ```
 */
export declare class AnafEfacturaClient {
    private config;
    private httpClient;
    private basePath;
    private authenticator;
    private currentAccessToken?;
    private accessTokenExpiresAt?;
    private refreshToken;
    /**
     * Create a new ANAF e-Factura client
     *
     * @param config Client configuration
     * @param authenticator Authenticator for OAuth flows and token refresh
     * @throws {AnafValidationError} If required configuration is missing
     */
    constructor(config: AnafEfacturaClientConfig, authenticator: AnafAuthenticator);
    /**
     * Upload invoice document to ANAF
     *
     * Uploads an XML invoice document (UBL, CN, CII, or RASP format) to ANAF
     * for processing in the e-Factura system.
     *
     * @param xmlContent XML document content as string
     * @param options Upload options (standard, extern, etc.)
     * @returns Upload status with upload ID for tracking
     * @throws {AnafApiError} If upload fails
     * @throws {AnafValidationError} If parameters are invalid
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    uploadDocument(xmlContent: string, options?: UploadOptions): Promise<UploadResponse>;
    /**
     * Upload B2C (Business to Consumer) invoice
     *
     * Simplified upload method for B2C invoices with reduced validation requirements.
     * Uses identical parameters and response format as B2B upload.
     *
     * @param xmlContent XML document content as string
     * @param options Upload options
     * @returns Upload status with upload ID for tracking
     * @throws {AnafApiError} If upload fails
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    uploadB2CDocument(xmlContent: string, options?: UploadOptions): Promise<UploadResponse>;
    /**
     * Get upload status
     *
     * Check the processing status of a previously uploaded document.
     *
     * @param uploadId Upload ID returned from upload operation
     * @returns Current status of the upload
     * @throws {AnafApiError} If status check fails
     * @throws {AnafValidationError} If parameters are invalid
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    getUploadStatus(uploadId: string): Promise<StatusResponse>;
    /**
     * Download processed document
     *
     * Download the result of a processed document, which may include:
     * - Validated and signed XML
     * - Error details if processing failed
     * - ZIP archive with multiple files
     *
     * @param downloadId Download ID from status response
     * @returns Document content as string
     * @throws {AnafApiError} If download fails
     * @throws {AnafValidationError} If parameters are invalid
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    downloadDocument(downloadId: string): Promise<string>;
    /**
     * Get messages with pagination
     *
     * Retrieve messages with pagination support for large result sets.
     *
     * @param params Paginated message parameters
     * @returns List of messages for the specified page
     * @throws {AnafApiError} If message retrieval fails
     * @throws {AnafValidationError} If parameters are invalid
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    getMessagesPaginated(params: PaginatedMessagesParams): Promise<PaginatedListMessagesResponse>;
    /**
     * Get recent messages
     *
     * Retrieve messages from ANAF for the configured VAT number within
     * the specified number of days.
     *
     * @param params Message listing parameters
     * @returns List of messages
     * @throws {AnafApiError} If message retrieval fails
     * @throws {AnafValidationError} If parameters are invalid
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    getMessages(params: ListMessagesParams): Promise<ListMessagesResponse>;
    /**
     * Validate XML document
     *
     * Validate an XML document against ANAF schemas without uploading it
     * to the e-Factura system.
     *
     * @param xmlContent XML document to validate
     * @param standard Document standard (FACT1 or FCN)
     * @returns Validation result
     * @throws {AnafApiError} If validation request fails
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    validateXml(xmlContent: string, standard?: DocumentStandardType): Promise<ValidationResult>;
    /**
     * Validate digital signature
     *
     * Validate the digital signature of an XML document and signature file.
     * Accepts either File objects (browser) or Buffer objects (Node.js).
     *
     * @param xmlFile XML document file (File in browser, Buffer in Node.js)
     * @param signatureFile Signature file (File in browser, Buffer in Node.js)
     * @param xmlFileName Name for the XML file (required for Buffer uploads)
     * @param signatureFileName Name for the signature file (required for Buffer uploads)
     * @returns Validation result
     * @throws {AnafApiError} If signature validation fails
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    validateSignature(xmlFile: File | Buffer, signatureFile: File | Buffer, xmlFileName?: string, signatureFileName?: string): Promise<ValidationResult>;
    /**
     * Convert XML to PDF with validation
     *
     * Convert an e-Factura XML document to PDF format with validation.
     * According to the schema, this either returns PDF binary data or JSON error response.
     *
     * @param xmlContent XML document to convert
     * @param standard Document standard (FACT1 or FCN)
     * @returns PDF content as Buffer
     * @throws {AnafApiError} If conversion fails
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    convertXmlToPdf(xmlContent: string, standard?: DocumentStandardType): Promise<Buffer>;
    /**
     * Convert XML to PDF without validation
     *
     * Convert an e-Factura XML document to PDF format without validation.
     * Note: Without validation, ANAF does not guarantee the correctness of the generated PDF.
     *
     * @param xmlContent XML document to convert
     * @param standard Document standard (FACT1 or FCN)
     * @returns PDF content as Buffer
     * @throws {AnafApiError} If conversion fails
     * @throws {AnafAuthenticationError} If authentication is not configured or fails
     */
    convertXmlToPdfNoValidation(xmlContent: string, standard?: DocumentStandardType): Promise<Buffer>;
    /**
     * Get a valid access token, refreshing if necessary
     * @returns A valid access token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    private getValidAccessToken;
    /**
     * Check if the current access token is valid and not expired
     * @param buffer Time in seconds as buffer when the token is considered expired
     * @returns True if token is valid and not expired
     */
    isTokenValid(buffer?: number): boolean;
    /**
     * Refresh the access token using the stored refresh token
     * @returns The updated token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    refreshAccessToken(): Promise<TokenResponse>;
    /**
     * Refresh the access token using the stored refresh token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    setAccessToken(access_token: string, accessTokenExpiresAt: number | Date): void;
    private validateConfig;
    private validateXmlContent;
    private validateUploadId;
    private validateDownloadId;
    private validateListMessagesParams;
    private validatePaginatedMessagesParams;
    private validateUploadOptions;
    private validateDocumentStandard;
    private handleApiError;
}
