import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  AnafClientConfig,
  TokenResponse,
  OAuthTokens,
  UploadStatus,
  UploadOptions,
  ListMessagesParams,
  PaginatedMessagesParams,
  ListMessagesResponse,
  ValidationResult,
  InvoiceInput,
  StandardType,
  DocumentStandardType
} from './types';
import {
  AnafSdkError,
  AnafApiError,
  AnafAuthenticationError,
  AnafValidationError,
} from './errors';
import {
  getBasePath,
  getValidationUrl,
  getXmlToPdfUrl,
  getSignatureValidationUrl,
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  UPLOAD_PATH,
  UPLOAD_B2C_PATH,
  STATUS_MESSAGE_PATH,
  DOWNLOAD_PATH,
  LIST_MESSAGES_PATH,
  LIST_MESSAGES_PAGINATED_PATH,
  DEFAULT_TIMEOUT,
  buildUploadParams,
  buildStatusParams,
  buildDownloadParams,
  buildListMessagesParams,
  buildPaginatedMessagesParams
} from './constants';
import { parseXmlResponse, parseJsonResponse, isErrorResponse, extractErrorMessage } from './utils/xmlParser';
import { formatDateForAnaf, isValidDaysParameter } from './utils/dateUtils';
import { buildOAuthAuthorizationUrl, encodeOAuthTokenRequest } from './utils/formEncoder';
import { buildInvoiceXml } from './ubl/InvoiceBuilder';
import { tryCatch } from './tryCatch';

/**
 * Main client for interacting with ANAF e-Factura API
 * 
 * Provides comprehensive access to all ANAF e-Factura services using OAuth 2.0 authentication:
 * - OAuth 2.0 authentication with USB token (browser-based, one-time setup)
 * - Document upload (UBL, B2B, B2C)
 * - Status checking and document download
 * - Message listing with pagination
 * - XML validation and PDF conversion
 * - Digital signature validation
 * - UBL invoice generation
 * 
 * @example
 * ```typescript
 * const client = new AnafClient({
 *   clientId: 'oauth-client-id',
 *   clientSecret: 'oauth-client-secret', 
 *   redirectUri: 'https://app.com/oauth/callback',
 *   vatNumber: 'RO12345678',
 *   testMode: true
 * });
 * 
 * // OAuth flow (user uses USB token in browser for authentication)
 * const authUrl = client.getAuthorizationUrl();
 * // User goes to authUrl, authenticates with USB token, returns with code
 * const tokens = await client.exchangeCodeForToken(authCode);
 * 
 * // All subsequent API calls use OAuth tokens (no USB token needed)
 * const xml = client.generateInvoiceXml(invoiceData);
 * const uploadResult = await client.uploadDocument(tokens.access_token, xml);
 * 
 * // Check status
 * const status = await client.getUploadStatus(tokens.access_token, uploadResult.index_incarcare);
 * ```
 */
export class AnafClient {
  private config: Required<AnafClientConfig>;
  private httpClient: AxiosInstance;
  private basePath: string;

  /**
   * Create a new ANAF e-Factura client
   * 
   * @param config Client configuration
   * @throws {AnafValidationError} If required configuration is missing
   * 
   * @example
   * ```typescript
   * const client = new AnafClient({
   *   clientId: 'oauth-client-id',
   *   clientSecret: 'oauth-client-secret', 
   *   redirectUri: 'https://app.com/oauth/callback',
   *   vatNumber: 'RO12345678',
   *   testMode: true
   * });
   * ```
   */
  constructor(config: AnafClientConfig) {
    this.validateConfig(config);
    
    // Set defaults
    this.config = {
      ...config,
      testMode: config.testMode ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      axiosOptions: config.axiosOptions ?? {},
      basePath: config.basePath ?? ''
    };

    // Initialize base path
    this.basePath = this.config.basePath || getBasePath('oauth', this.config.testMode);

    // Create HTTP client
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      ...this.config.axiosOptions
    });

    // Add request/response interceptors for debugging
    this.setupInterceptors();
  }

  // ==========================================================================
  // OAUTH 2.0 AUTHENTICATION
  // ==========================================================================

  /**
   * Generate OAuth authorization URL
   * 
   * Creates the URL users should visit to authorize your application.
   * After authorization, they'll be redirected to your configured redirect URI
   * with an authorization code.
   * 
   * @param scope Optional OAuth scope parameter
   * @returns Authorization URL for user to visit
   * @throws {AnafValidationError} If OAuth configuration is invalid
   * 
   * @example
   * ```typescript
   * const authUrl = client.getAuthorizationUrl();
   * // Direct user to authUrl to complete OAuth flow
   * ```
   * 
   * @example
   * ```typescript
   * // With custom scope
   * const authUrl = client.getAuthorizationUrl('custom-scope');
   * ```
   */
  public getAuthorizationUrl(scope?: string): string {
    this.validateOAuthConfig();
    
    return buildOAuthAuthorizationUrl(OAUTH_AUTHORIZE_URL, {
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      token_content_type: 'jwt',
      scope
    });
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * 
   * Call this method with the authorization code received from the OAuth redirect
   * to obtain tokens for API access.
   * 
   * @param code Authorization code from OAuth redirect
   * @returns Token response with access and refresh tokens
   * @throws {AnafAuthenticationError} If token exchange fails
   * @throws {AnafValidationError} If code is invalid
   * 
   * @example
   * ```typescript
   * const tokens = await client.exchangeCodeForToken(authorizationCode);
   * console.log('Access token:', tokens.access_token);
   * ```
   */
  public async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    if (!code?.trim()) {
      throw new AnafValidationError('Authorization code is required');
    }

    this.validateOAuthConfig();

    const formData = encodeOAuthTokenRequest({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code,
      token_content_type: 'jwt'
    });

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post<TokenResponse>(
        OAUTH_TOKEN_URL,
        formData,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (!response.data?.access_token) {
        throw new AnafAuthenticationError('Token response missing access token');
      }

      return response.data;
    });

    if (error) {
      this.handleApiError(error, 'Failed to exchange authorization code for tokens');
    }

    return data;
  }

  /**
   * Refresh access token using refresh token
   * 
   * Use this method to obtain a new access token when the current one expires.
   * 
   * @param refreshToken Refresh token obtained from initial token exchange
   * @returns New token response
   * @throws {AnafAuthenticationError} If token refresh fails
   * @throws {AnafValidationError} If refresh token is invalid
   * 
   * @example
   * ```typescript
   * const newTokens = await client.refreshAccessToken(refreshToken);
   * ```
   */
  public async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    if (!refreshToken?.trim()) {
      throw new AnafValidationError('Refresh token is required');
    }

    this.validateOAuthConfig();

    const formData = encodeOAuthTokenRequest({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      refresh_token: refreshToken,
      token_content_type: 'jwt'
    });

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post<TokenResponse>(
        OAUTH_TOKEN_URL,
        formData,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (!response.data?.access_token) {
        throw new AnafAuthenticationError('Token response missing access token');
      }

      return response.data;
    });

    if (error) {
      this.handleApiError(error, 'Failed to refresh access token');
    }

    return data;
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
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document content as string
   * @param options Upload options (standard, extern, etc.)
   * @returns Upload status with upload ID for tracking
   * @throws {AnafApiError} If upload fails
   * @throws {AnafValidationError} If parameters are invalid
   * 
   * @example
   * ```typescript
   * const xml = client.generateInvoiceXml(invoiceData);
   * const result = await client.uploadDocument(accessToken, xml, {
   *   standard: 'UBL',
   *   executare: true
   * });
   * console.log('Upload ID:', result.index_incarcare);
   * ```
   */
  public async uploadDocument(
    accessToken: string,
    xmlContent: string,
    options: UploadOptions = {}
  ): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);

    const params = buildUploadParams(this.config.vatNumber, options);
    const url = `${this.basePath}${UPLOAD_PATH}?${params.toString()}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post<string>(url, xmlContent, {
        headers
      });

      return parseXmlResponse(response.data);
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
   * 
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document content as string
   * @returns Upload status with upload ID for tracking
   * @throws {AnafApiError} If upload fails
   * 
   * @example
   * ```typescript
   * const result = await client.uploadB2CDocument(accessToken, xmlContent);
   * ```
   */
  public async uploadB2CDocument(accessToken: string, xmlContent: string): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);

    const params = new URLSearchParams();
    params.append('cif', this.config.vatNumber);
    const url = `${this.basePath}${UPLOAD_B2C_PATH}?${params.toString()}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post<string>(url, xmlContent, {
        headers
      });

      return parseXmlResponse(response.data);
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
   * @param accessToken Valid OAuth access token
   * @param uploadId Upload ID returned from upload operation
   * @returns Current status of the upload
   * @throws {AnafApiError} If status check fails
   * @throws {AnafValidationError} If parameters are invalid
   * 
   * @example
   * ```typescript
   * const status = await client.getUploadStatus(accessToken, uploadId);
   * 
   * if (status.stare === 'ok' && status.id_descarcare) {
   *   // Document processed successfully, can download result
   *   const result = await client.downloadDocument(accessToken, status.id_descarcare);
   * }
   * ```
   */
  public async getUploadStatus(accessToken: string, uploadId: string): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateUploadId(uploadId);

    const params = buildStatusParams(uploadId);
    const url = `${this.basePath}${STATUS_MESSAGE_PATH}?${params.toString()}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.get<string>(url, {
        headers
      });

      return parseXmlResponse(response.data);
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
   * @param accessToken Valid OAuth access token
   * @param downloadId Download ID from status response
   * @returns Document content as string
   * @throws {AnafApiError} If download fails
   * @throws {AnafValidationError} If parameters are invalid
   * 
   * @example
   * ```typescript
   * const content = await client.downloadDocument(accessToken, downloadId);
   * // Content might be XML, ZIP, or error information
   * ```
   */
  public async downloadDocument(accessToken: string, downloadId: string): Promise<string> {
    this.validateAccessToken(accessToken);
    this.validateDownloadId(downloadId);

    const params = buildDownloadParams(downloadId);
    const url = `${this.basePath}${DOWNLOAD_PATH}?${params.toString()}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.get<string>(url, {
        headers
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
   * Get recent messages
   * 
   * Retrieve messages from ANAF for the configured VAT number within
   * the specified number of days.
   * 
   * @param accessToken Valid OAuth access token
   * @param params Message listing parameters
   * @returns List of messages
   * @throws {AnafApiError} If message retrieval fails
   * @throws {AnafValidationError} If parameters are invalid
   * 
   * @example
   * ```typescript
   * const messages = await client.getMessages(accessToken, {
   *   zile: 5,
   *   filtru: 'E' // Only errors
   * });
   * ```
   */
  public async getMessages(
    accessToken: string,
    params: ListMessagesParams
  ): Promise<ListMessagesResponse> {
    this.validateAccessToken(accessToken);
    this.validateListMessagesParams(params);

    const queryParams = buildListMessagesParams(
      this.config.vatNumber,
      params.zile,
      params.filtru
    );
    const url = `${this.basePath}${LIST_MESSAGES_PATH}?${queryParams.toString()}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.get(url, {
        headers
      });

      const data = parseJsonResponse<ListMessagesResponse>(response.data);
      
      if (isErrorResponse(data)) {
        const errorMessage = extractErrorMessage(data);
        throw new AnafApiError(errorMessage || 'Error retrieving messages');
      }

      return data;
    });

    if (error) {
      this.handleApiError(error, 'Failed to get messages');
    }

    return data;
  }

  /**
   * Get messages with pagination
   * 
   * Retrieve messages with pagination support for large result sets.
   * 
   * @param accessToken Valid OAuth access token
   * @param params Paginated message parameters
   * @returns List of messages for the specified page
   * @throws {AnafApiError} If message retrieval fails
   * @throws {AnafValidationError} If parameters are invalid
   * 
   * @example
   * ```typescript
   * const messages = await client.getMessagesPaginated(accessToken, {
   *   startTime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
   *   endTime: Date.now(),
   *   pagina: 1,
   *   filtru: 'T' // All types
   * });
   * ```
   */
  public async getMessagesPaginated(
    accessToken: string,
    params: PaginatedMessagesParams
  ): Promise<ListMessagesResponse> {
    this.validateAccessToken(accessToken);
    this.validatePaginatedMessagesParams(params);

    const queryParams = buildPaginatedMessagesParams(
      this.config.vatNumber,
      params.startTime,
      params.endTime,
      params.pagina,
      params.filtru
    );
    const url = `${this.basePath}${LIST_MESSAGES_PAGINATED_PATH}?${queryParams.toString()}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.get(url, {
        headers
      });

      const data = parseJsonResponse<ListMessagesResponse>(response.data);
      
      if (isErrorResponse(data)) {
        const errorMessage = extractErrorMessage(data);
        throw new AnafApiError(errorMessage || 'Error retrieving paginated messages');
      }

      return data;
    });

    if (error) {
      this.handleApiError(error, 'Failed to get paginated messages');
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
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document to validate
   * @param standard Document standard (FACT1 or FCN)
   * @returns Validation result
   * @throws {AnafApiError} If validation request fails
   * 
   * @example
   * ```typescript
   * const xml = client.generateInvoiceXml(invoiceData);
   * const result = await client.validateXml(accessToken, xml, 'FACT1');
   * 
   * if (result.valid) {
   *   console.log('XML is valid');
   * } else {
   *   console.log('Validation errors:', result.details);
   * }
   * ```
   */
  public async validateXml(
    accessToken: string,
    xmlContent: string,
    standard: DocumentStandardType = 'FACT1'
  ): Promise<ValidationResult> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);

    const url = `${getValidationUrl('oauth')}/${standard}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers
      });

      // Parse validation response
      const responseText = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);

      return {
        valid: !responseText.toLowerCase().includes('error'),
        details: responseText,
        info: `Validation performed using ${standard} standard`
      };
    });

    if (error) {
      this.handleApiError(error, 'Failed to validate XML');
    }

    return data;
  }

  /**
   * Convert XML to PDF
   * 
   * Convert an e-Factura XML document to PDF format for presentation
   * or printing purposes.
   * 
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document to convert
   * @param standard Document standard (FACT1 or FCN)
   * @param includeDiacritics Whether to include diacritics in output
   * @returns PDF content as Buffer
   * @throws {AnafApiError} If conversion fails
   * 
   * @example
   * ```typescript
   * const xml = client.generateInvoiceXml(invoiceData);
   * const pdfBuffer = await client.convertXmlToPdf(accessToken, xml, 'FACT1', true);
   * 
   * fs.writeFileSync('invoice.pdf', pdfBuffer);
   * ```
   */
  public async convertXmlToPdf(
    accessToken: string,
    xmlContent: string,
    standard: DocumentStandardType = 'FACT1',
    includeDiacritics: boolean = false
  ): Promise<Buffer> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);

    const baseUrl = getXmlToPdfUrl('oauth');
    const diacriticsPath = includeDiacritics ? '/DA' : '';
    const url = `${baseUrl}/${standard}${diacriticsPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers,
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    });

    if (error) {
      this.handleApiError(error, 'Failed to convert XML to PDF');
    }

    return data;
  }

  /**
   * Validate digital signature
   * 
   * Validate the digital signature of an XML document.
   * 
   * @param accessToken Valid OAuth access token
   * @param xmlContent Signed XML document
   * @returns Validation result
   * @throws {AnafApiError} If signature validation fails
   * 
   * @example
   * ```typescript
   * const result = await client.validateSignature(accessToken, signedXml);
   * 
   * if (result.valid) {
   *   console.log('Signature is valid');
   * }
   * ```
   */
  public async validateSignature(accessToken: string, xmlContent: string): Promise<ValidationResult> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);

    const url = getSignatureValidationUrl('oauth');

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Authorization': `Bearer ${accessToken}`
    };

    const {data, error} = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers
      });

      const responseText = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);

      return {
        valid: !responseText.toLowerCase().includes('error'),
        details: responseText
      };
    });

    if (error) {
      this.handleApiError(error, 'Failed to validate signature');
    }

    return data;
  }

  // ==========================================================================
  // UBL GENERATION
  // ==========================================================================

  /**
   * Generate UBL invoice XML
   * 
   * Create a UBL 2.1 XML invoice that complies with Romanian CIUS-RO
   * specification for ANAF e-Factura.
   * 
   * @param invoiceData Invoice data
   * @returns UBL XML string ready for upload
   * @throws {AnafValidationError} If invoice data is invalid
   * 
   * @example
   * ```typescript
   * const xml = client.generateInvoiceXml({
   *   invoiceNumber: 'INV-2024-001',
   *   issueDate: new Date(),
   *   supplier: {
   *     registrationName: 'Company SRL',
   *     companyId: 'RO12345678',
   *     vatNumber: 'RO12345678',
   *     address: {
   *       street: 'Str. Example 1',
   *       city: 'Bucharest',
   *       postalZone: '010101'
   *     }
   *   },
   *   customer: {
   *     registrationName: 'Customer SRL',
   *     companyId: 'RO87654321',
   *     address: {
   *       street: 'Str. Customer 2',
   *       city: 'Cluj-Napoca',
   *       postalZone: '400001'
   *     }
   *   },
   *   lines: [
   *     {
   *       description: 'Product/Service',
   *       quantity: 1,
   *       unitPrice: 100,
   *       taxPercent: 19
   *     }
   *   ],
   *   isSupplierVatPayer: true
   * });
   * ```
   */
  public generateInvoiceXml(invoiceData: InvoiceInput): string {
    const {data, error} = tryCatch(() => {
      return buildInvoiceXml(invoiceData);
    });

    if (error) {
      throw new AnafValidationError(`Failed to generate invoice XML: ${error.message}`);
    }

    return data;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private validateConfig(config: AnafClientConfig): void {
    if (!config) {
      throw new AnafValidationError('Configuration is required');
    }

    if (!config.vatNumber?.trim()) {
      throw new AnafValidationError('VAT number is required');
    }

    if (!config.clientId?.trim()) {
      throw new AnafValidationError('OAuth client ID is required');
    }
    if (!config.clientSecret?.trim()) {
      throw new AnafValidationError('OAuth client secret is required');
    }
    if (!config.redirectUri?.trim()) {
      throw new AnafValidationError('OAuth redirect URI is required');
    }
  }

  private validateOAuthConfig(): void {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new AnafValidationError('OAuth configuration is incomplete');
    }
  }

  private validateAccessToken(accessToken: string): void {
    if (!accessToken?.trim()) {
      throw new AnafValidationError('Access token is required');
    }
  }

  private validateXmlContent(xmlContent: string): void {
    if (!xmlContent?.trim()) {
      throw new AnafValidationError('XML content is required');
    }
  }

  private validateUploadId(uploadId: string): void {
    if (!uploadId?.trim()) {
      throw new AnafValidationError('Upload ID is required');
    }
  }

  private validateDownloadId(downloadId: string): void {
    if (!downloadId?.trim()) {
      throw new AnafValidationError('Download ID is required');
    }
  }

  private validateListMessagesParams(params: ListMessagesParams): void {
    if (!params) {
      throw new AnafValidationError('Message listing parameters are required');
    }
    if (!isValidDaysParameter(params.zile)) {
      throw new AnafValidationError('Days parameter must be between 1 and 60');
    }
  }

  private validatePaginatedMessagesParams(params: PaginatedMessagesParams): void {
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

  private setupInterceptors(): void {
    // Request interceptor for debugging
    this.httpClient.interceptors.request.use(
      (config) => {
        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ANAF API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for debugging
    this.httpClient.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ANAF API] Response ${response.status} for ${response.config.url}`);
        }
        return response;
      },
      (error) => Promise.reject(error)
    );
  }

  private handleApiError(error: any, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      let message = `${context}: ${axiosError.message}`;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        message = `${context}: HTTP ${status} - ${axiosError.message}`;
        
        // Try to extract error details from response
        if (typeof axiosError.response.data === 'string') {
          const {data: parsedError, error: error1} = tryCatch(() => {
            return parseXmlResponse(axiosError.response?.data as string);
          });

          if (parsedError) {
            if (parsedError.eroare) {
              message += ` - ${parsedError.eroare}`;
            }
          }
        }
        
        // Determine specific error type based on status code
        if (status === 401 || status === 403) {
          throw new AnafAuthenticationError(message);
        } else if (status >= 400 && status < 500) {
          throw new AnafValidationError(message);
        } else {
          throw new AnafApiError(message, status, axiosError.response.data);
        }
      } else {
        throw new AnafApiError(message);
      }
    } else if (error instanceof AnafSdkError) {
      throw error;
    } else {
      throw new AnafSdkError(`${context}: ${error.message || 'Unknown error'}`);
    }
  }
} 