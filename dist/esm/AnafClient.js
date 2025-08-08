import { AnafSdkError, AnafApiError, AnafValidationError, AnafAuthenticationError } from './errors';
import { getBasePath, UPLOAD_PATH, UPLOAD_B2C_PATH, STATUS_MESSAGE_PATH, DOWNLOAD_PATH, LIST_MESSAGES_PATH, LIST_MESSAGES_PAGINATED_PATH, DEFAULT_TIMEOUT, buildUploadParams, buildStatusParams, buildDownloadParams, buildListMessagesParams, buildPaginatedMessagesParams, } from './constants';
import { parseUploadResponse, parseStatusResponse, parseJsonResponse, isErrorResponse, extractErrorMessage, } from './utils/xmlParser';
import { isValidDaysParameter } from './utils/dateUtils';
import { HttpClient } from './utils/httpClient';
import { tryCatch } from './tryCatch';
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
export class AnafEfacturaClient {
    /**
     * Create a new ANAF e-Factura client
     *
     * @param config Client configuration
     * @param authenticator Authenticator for OAuth flows and token refresh
     * @throws {AnafValidationError} If required configuration is missing
     */
    constructor(config, authenticator) {
        var _a, _b, _c, _d;
        this.validateConfig(config);
        this.config = Object.assign(Object.assign({}, config), { testMode: (_a = config.testMode) !== null && _a !== void 0 ? _a : false, timeout: (_b = config.timeout) !== null && _b !== void 0 ? _b : DEFAULT_TIMEOUT, axiosOptions: (_c = config.axiosOptions) !== null && _c !== void 0 ? _c : {}, basePath: (_d = config.basePath) !== null && _d !== void 0 ? _d : '', refreshToken: config.refreshToken });
        this.basePath = this.config.basePath || getBasePath('oauth', this.config.testMode);
        this.httpClient = new HttpClient({
            baseURL: this.basePath,
            timeout: this.config.timeout,
        });
        // Initialize authentication - both refreshToken and authenticator are now required
        this.refreshToken = config.refreshToken;
        this.authenticator = authenticator;
    }
    // ==========================================================================
    // DOCUMENT UPLOAD
    // ==========================================================================
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
    async uploadDocument(xmlContent, options = {}) {
        this.validateXmlContent(xmlContent);
        this.validateUploadOptions(options);
        const params = buildUploadParams(this.config.vatNumber, options);
        const url = `${UPLOAD_PATH}?${params.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, xmlContent, {
                headers: {
                    'Content-Type': 'application/xml',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return parseUploadResponse(response.data);
        });
        if (error) {
            this.handleApiError(error, 'Failed to upload document');
        }
        return data;
    }
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
    async uploadB2CDocument(xmlContent, options = {}) {
        this.validateXmlContent(xmlContent);
        this.validateUploadOptions(options);
        const params = buildUploadParams(this.config.vatNumber, options);
        const url = `${UPLOAD_B2C_PATH}?${params.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, xmlContent, {
                headers: {
                    'Content-Type': 'application/xml',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return parseUploadResponse(response.data);
        });
        if (error) {
            this.handleApiError(error, 'Failed to upload B2C document');
        }
        return data;
    }
    // ==========================================================================
    // STATUS AND DOWNLOAD
    // ==========================================================================
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
    async getUploadStatus(uploadId) {
        this.validateUploadId(uploadId);
        const params = buildStatusParams(uploadId);
        const url = `${STATUS_MESSAGE_PATH}?${params.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return parseStatusResponse(response.data);
        });
        if (error) {
            this.handleApiError(error, 'Failed to get upload status');
        }
        return data;
    }
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
    async downloadDocument(downloadId) {
        this.validateDownloadId(downloadId);
        const params = buildDownloadParams(downloadId);
        const url = `${DOWNLOAD_PATH}?${params.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        });
        if (error) {
            this.handleApiError(error, 'Failed to download document');
        }
        return data;
    }
    // ==========================================================================
    // MESSAGE LISTING
    // ==========================================================================
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
    async getMessagesPaginated(params) {
        this.validatePaginatedMessagesParams(params);
        const queryParams = buildPaginatedMessagesParams(this.config.vatNumber, params.startTime, params.endTime, params.pagina, params.filtru);
        const url = `${LIST_MESSAGES_PAGINATED_PATH}?${queryParams.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const data = parseJsonResponse(response.data);
            if (isErrorResponse(data)) {
                throw new AnafApiError(extractErrorMessage(data) || 'Error retrieving paginated messages');
            }
            return data;
        });
        if (error) {
            this.handleApiError(error, 'Failed to get paginated messages');
        }
        return data;
    }
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
    async getMessages(params) {
        this.validateListMessagesParams(params);
        const queryParams = buildListMessagesParams(this.config.vatNumber, params.zile, params.filtru);
        const url = `${LIST_MESSAGES_PATH}?${queryParams.toString()}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const data = parseJsonResponse(response.data);
            if (isErrorResponse(data)) {
                throw new AnafApiError(extractErrorMessage(data) || 'Error retrieving messages');
            }
            return data;
        });
        if (error) {
            this.handleApiError(error, 'Failed to get messages');
        }
        return data;
    }
    // ==========================================================================
    // VALIDATION AND CONVERSION
    // ==========================================================================
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
    async validateXml(xmlContent, standard = 'FACT1') {
        this.validateXmlContent(xmlContent);
        this.validateDocumentStandard(standard);
        const url = `/validare/${standard}`;
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, xmlContent, {
                headers: {
                    'Content-Type': 'text/plain',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const responseData = parseJsonResponse(response.data);
            return {
                valid: responseData.stare === 'ok',
                details: responseData.Messages
                    ? responseData.Messages.map((m) => m.message).join('\n')
                    : `Validation ${responseData.stare === 'ok' ? 'passed' : 'failed'}`,
                info: `Validation performed using ${standard} standard (trace_id: ${responseData.trace_id})`,
            };
        });
        if (error) {
            this.handleApiError(error, 'Failed to validate XML');
        }
        return data;
    }
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
    async validateSignature(xmlFile, signatureFile, xmlFileName, signatureFileName) {
        const url = `/api/validate/signature`;
        const formData = new FormData();
        // Handle File objects (browser) vs Buffer objects (Node.js)
        if (typeof File !== 'undefined' && xmlFile instanceof File) {
            formData.append('file', xmlFile);
        }
        else if (xmlFile instanceof Buffer) {
            if (!xmlFileName) {
                throw new AnafValidationError('XML file name is required when uploading Buffer');
            }
            // Create Blob-like object for Node.js compatibility
            const blob = new Blob([xmlFile], { type: 'text/xml' });
            formData.append('file', blob, xmlFileName);
        }
        else {
            throw new AnafValidationError('Invalid XML file type. Expected File or Buffer');
        }
        if (typeof File !== 'undefined' && signatureFile instanceof File) {
            formData.append('signature', signatureFile);
        }
        else if (signatureFile instanceof Buffer) {
            if (!signatureFileName) {
                throw new AnafValidationError('Signature file name is required when uploading Buffer');
            }
            // Create Blob-like object for Node.js compatibility
            const blob = new Blob([signatureFile], { type: 'application/octet-stream' });
            formData.append('signature', blob, signatureFileName);
        }
        else {
            throw new AnafValidationError('Invalid signature file type. Expected File or Buffer');
        }
        const { data, error } = tryCatch(async () => {
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const responseData = response.data;
            const msg = responseData.msg || '';
            return {
                valid: msg.includes('validate cu succes') && !msg.includes('NU'),
                details: msg,
            };
        });
        if (error) {
            this.handleApiError(error, 'Failed to validate signature');
        }
        return data;
    }
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
    async convertXmlToPdf(xmlContent, standard = 'FACT1') {
        this.validateXmlContent(xmlContent);
        this.validateDocumentStandard(standard);
        const url = `/transformare/${standard}`;
        const { data, error } = tryCatch(async () => {
            var _a, _b;
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, xmlContent, {
                headers: {
                    'Content-Type': 'text/plain',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            // Check if response is JSON (error) or binary (PDF)
            if ((_b = (_a = response.headers) === null || _a === void 0 ? void 0 : _a.get('content-type')) === null || _b === void 0 ? void 0 : _b.includes('application/json')) {
                const errorData = parseJsonResponse(response.data);
                throw new AnafApiError(errorData.Messages ? errorData.Messages.map((m) => m.message).join('\n') : 'PDF conversion failed');
            }
            // Return PDF binary data
            if (response.data instanceof ArrayBuffer) {
                return Buffer.from(response.data);
            }
            else {
                // Fallback for when content-type detection doesn't work
                return Buffer.from(response.data);
            }
        });
        if (error) {
            this.handleApiError(error, 'Failed to convert XML to PDF');
        }
        return data;
    }
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
    async convertXmlToPdfNoValidation(xmlContent, standard = 'FACT1') {
        this.validateXmlContent(xmlContent);
        this.validateDocumentStandard(standard);
        const url = `/transformare/${standard}/DA`;
        const { data, error } = tryCatch(async () => {
            var _a, _b;
            const accessToken = await this.getValidAccessToken();
            const response = await this.httpClient.post(url, xmlContent, {
                headers: {
                    'Content-Type': 'text/plain',
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            // Check if response is JSON (error) or binary (PDF)
            if ((_b = (_a = response.headers) === null || _a === void 0 ? void 0 : _a.get('content-type')) === null || _b === void 0 ? void 0 : _b.includes('application/json')) {
                const errorData = parseJsonResponse(response.data);
                throw new AnafApiError(errorData.Messages ? errorData.Messages.map((m) => m.message).join('\n') : 'PDF conversion failed');
            }
            // Return PDF binary data
            if (response.data instanceof ArrayBuffer) {
                return Buffer.from(response.data);
            }
            else {
                // Fallback for when content-type detection doesn't work
                return Buffer.from(response.data);
            }
        });
        if (error) {
            this.handleApiError(error, 'Failed to convert XML to PDF without validation');
        }
        return data;
    }
    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================
    /**
     * Get a valid access token, refreshing if necessary
     * @returns A valid access token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    async getValidAccessToken() {
        // Check if current token is still valid
        if (this.isTokenValid()) {
            return this.currentAccessToken;
        }
        // Refresh the token
        await this.refreshAccessToken();
        return this.currentAccessToken;
    }
    /**
     * Check if the current access token is valid and not expired
     * @param buffer Time in seconds as buffer when the token is considered expired
     * @returns True if token is valid and not expired
     */
    isTokenValid(buffer = 30) {
        if (!this.currentAccessToken || !this.accessTokenExpiresAt) {
            return false;
        }
        // Add 30 second buffer to avoid using tokens that are about to expire
        const bufferMs = buffer * 1000;
        return Date.now() < this.accessTokenExpiresAt - bufferMs;
    }
    /**
     * Refresh the access token using the stored refresh token
     * @returns The updated token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    async refreshAccessToken() {
        try {
            const tokenResponse = await this.authenticator.refreshAccessToken(this.refreshToken);
            this.currentAccessToken = tokenResponse.access_token;
            this.accessTokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;
            // Update refresh token if a new one was provided
            if (tokenResponse.refresh_token) {
                this.refreshToken = tokenResponse.refresh_token;
            }
            return Object.assign(Object.assign({}, tokenResponse), { refresh_token: this.refreshToken });
        }
        catch (error) {
            throw new AnafAuthenticationError(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Refresh the access token using the stored refresh token
     * @throws {AnafAuthenticationError} If token refresh fails
     */
    setAccessToken(access_token, accessTokenExpiresAt) {
        this.currentAccessToken = access_token;
        this.accessTokenExpiresAt = new Date(accessTokenExpiresAt).getTime();
    }
    validateConfig(config) {
        var _a, _b;
        if (!config) {
            throw new AnafValidationError('Configuration is required');
        }
        if (!((_a = config.vatNumber) === null || _a === void 0 ? void 0 : _a.trim())) {
            throw new AnafValidationError('VAT number is required');
        }
        if (!((_b = config.refreshToken) === null || _b === void 0 ? void 0 : _b.trim())) {
            throw new AnafValidationError('Refresh token is required for automatic authentication');
        }
    }
    validateXmlContent(xmlContent) {
        if (!(xmlContent === null || xmlContent === void 0 ? void 0 : xmlContent.trim())) {
            throw new AnafValidationError('XML content is required');
        }
    }
    validateUploadId(uploadId) {
        if (!(uploadId === null || uploadId === void 0 ? void 0 : uploadId.trim())) {
            throw new AnafValidationError('Upload ID is required');
        }
    }
    validateDownloadId(downloadId) {
        if (!(downloadId === null || downloadId === void 0 ? void 0 : downloadId.trim())) {
            throw new AnafValidationError('Download ID is required');
        }
    }
    validateListMessagesParams(params) {
        if (!params) {
            throw new AnafValidationError('Message listing parameters are required');
        }
        if (!isValidDaysParameter(params.zile)) {
            throw new AnafValidationError('Days parameter must be between 1 and 60');
        }
    }
    validatePaginatedMessagesParams(params) {
        if (!params) {
            throw new AnafValidationError('Paginated message parameters are required');
        }
        if (typeof params.startTime !== 'number' || params.startTime <= 0) {
            throw new AnafValidationError('Valid start time is required');
        }
        if (typeof params.endTime !== 'number' || params.endTime <= 0) {
            throw new AnafValidationError('Valid end time is required');
        }
        if (params.endTime <= params.startTime) {
            throw new AnafValidationError('End time must be after start time');
        }
        if (typeof params.pagina !== 'number' || params.pagina < 1) {
            throw new AnafValidationError('Page number must be 1 or greater');
        }
    }
    validateUploadOptions(options) {
        if (options.standard && !['UBL', 'CN', 'CII', 'RASP'].includes(options.standard)) {
            throw new AnafValidationError('Standard must be one of: UBL, CN, CII, RASP');
        }
    }
    validateDocumentStandard(standard) {
        if (!['FACT1', 'FCN'].includes(standard)) {
            throw new AnafValidationError('Document standard must be FACT1 or FCN');
        }
    }
    handleApiError(error, context) {
        var _a, _b, _c;
        if (error instanceof AnafSdkError) {
            throw error;
        }
        else {
            // Check if it's an HTTP error with status code
            if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) || (error === null || error === void 0 ? void 0 : error.status)) {
                const status = ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || error.status;
                const errorMessage = error.message || ((_c = error.response) === null || _c === void 0 ? void 0 : _c.statusText) || 'Unknown error';
                switch (status) {
                    case 400:
                        throw new AnafValidationError(`${context}: Invalid request - ${errorMessage}`);
                    case 401:
                        throw new AnafAuthenticationError(`${context}: Authentication failed - ${errorMessage}`);
                    case 500:
                        throw new AnafApiError(`${context}: Server error - ${errorMessage}`, status);
                    default:
                        throw new AnafApiError(`${context}: HTTP ${status} - ${errorMessage}`, status);
                }
            }
            throw new AnafSdkError(`${context}: ${error.message || 'Unknown error'}`);
        }
    }
}
//# sourceMappingURL=AnafClient.js.map