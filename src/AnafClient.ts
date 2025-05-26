import {
  AnafEfacturaClientConfig,
  UploadStatus,
  UploadOptions,
  ListMessagesParams,
  PaginatedMessagesParams,
  ListMessagesResponse,
  ValidationResult,
  DocumentStandardType,
} from './types';
import { AnafSdkError, AnafApiError, AnafValidationError } from './errors';
import {
  getBasePath,
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
  buildPaginatedMessagesParams,
} from './constants';
import { parseXmlResponse, parseJsonResponse, isErrorResponse, extractErrorMessage } from './utils/xmlParser';
import { isValidDaysParameter } from './utils/dateUtils';
import { HttpClient } from './utils/httpClient';
import { tryCatch } from './tryCatch';

/**
 * Main client for interacting with ANAF e-Factura API
 *
 * Handles all API operations once you have a valid access token.
 * For authentication, use AnafAuthenticator separately.
 *
 * @example
 * ```typescript
 * const client = new AnafEfacturaClient({
 *   vatNumber: 'RO12345678',
 *   testMode: true
 * });
 *
 * // Upload document (token obtained from AnafAuthenticator)
 * const uploadResult = await client.uploadDocument(accessToken, xmlContent);
 *
 * // Check status
 * const status = await client.getUploadStatus(accessToken, uploadResult.index_incarcare);
 * ```
 */
export class AnafEfacturaClient {
  private config: Required<AnafEfacturaClientConfig>;
  private httpClient: HttpClient;
  private basePath: string;

  /**
   * Create a new ANAF e-Factura client
   *
   * @param config Client configuration
   * @throws {AnafValidationError} If required configuration is missing
   */
  constructor(config: AnafEfacturaClientConfig) {
    this.validateConfig(config);

    this.config = {
      ...config,
      testMode: config.testMode ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      axiosOptions: config.axiosOptions ?? {},
      basePath: config.basePath ?? '',
    };

    this.basePath = this.config.basePath || getBasePath('oauth', this.config.testMode);

    this.httpClient = new HttpClient({
      baseURL: this.basePath,
      timeout: this.config.timeout,
    });
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
   */
  public async uploadDocument(
    accessToken: string,
    xmlContent: string,
    options: UploadOptions = {}
  ): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);
    this.validateUploadOptions(options);

    const params = buildUploadParams(this.config.vatNumber, options);
    const url = `${UPLOAD_PATH}?${params.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post<string>(url, xmlContent, {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${accessToken}`,
        },
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
   * @param options Upload options
   * @returns Upload status with upload ID for tracking
   * @throws {AnafApiError} If upload fails
   */
  public async uploadB2CDocument(
    accessToken: string,
    xmlContent: string,
    options: UploadOptions = {}
  ): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);
    this.validateUploadOptions(options);

    const params = buildUploadParams(this.config.vatNumber, options);
    const url = `${UPLOAD_B2C_PATH}?${params.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post<string>(url, xmlContent, {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${accessToken}`,
        },
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
   */
  public async getUploadStatus(accessToken: string, uploadId: string): Promise<UploadStatus> {
    this.validateAccessToken(accessToken);
    this.validateUploadId(uploadId);

    const params = buildStatusParams(uploadId);
    const url = `${STATUS_MESSAGE_PATH}?${params.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.get<string>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
   */
  public async downloadDocument(accessToken: string, downloadId: string): Promise<string> {
    this.validateAccessToken(accessToken);
    this.validateDownloadId(downloadId);

    const params = buildDownloadParams(downloadId);
    const url = `${DOWNLOAD_PATH}?${params.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.get<string>(url, {
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
   * @param accessToken Valid OAuth access token
   * @param params Paginated message parameters
   * @returns List of messages for the specified page
   * @throws {AnafApiError} If message retrieval fails
   * @throws {AnafValidationError} If parameters are invalid
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
    const url = `${LIST_MESSAGES_PAGINATED_PATH}?${queryParams.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = parseJsonResponse<ListMessagesResponse>(response.data);

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
   * @param accessToken Valid OAuth access token
   * @param params Message listing parameters
   * @returns List of messages
   * @throws {AnafApiError} If message retrieval fails
   * @throws {AnafValidationError} If parameters are invalid
   */
  public async getMessages(accessToken: string, params: ListMessagesParams): Promise<ListMessagesResponse> {
    this.validateAccessToken(accessToken);
    this.validateListMessagesParams(params);

    const queryParams = buildListMessagesParams(this.config.vatNumber, params.zile, params.filtru);
    const url = `${LIST_MESSAGES_PATH}?${queryParams.toString()}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = parseJsonResponse<ListMessagesResponse>(response.data);

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
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document to validate
   * @param standard Document standard (FACT1 or FCN)
   * @returns Validation result
   * @throws {AnafApiError} If validation request fails
   */
  public async validateXml(
    accessToken: string,
    xmlContent: string,
    standard: DocumentStandardType = 'FACT1'
  ): Promise<ValidationResult> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);
    this.validateDocumentStandard(standard);

    const url = `/validare/${standard}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      return {
        valid: !responseText.toLowerCase().includes('error'),
        details: responseText,
        info: `Validation performed using ${standard} standard`,
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
   * @param accessToken Valid OAuth access token
   * @param xmlFile XML document file (File in browser, Buffer in Node.js)
   * @param signatureFile Signature file (File in browser, Buffer in Node.js)
   * @param xmlFileName Name for the XML file (required for Buffer uploads)
   * @param signatureFileName Name for the signature file (required for Buffer uploads)
   * @returns Validation result
   * @throws {AnafApiError} If signature validation fails
   */
  public async validateSignature(
    accessToken: string,
    xmlFile: File | Buffer,
    signatureFile: File | Buffer,
    xmlFileName?: string,
    signatureFileName?: string
  ): Promise<ValidationResult> {
    this.validateAccessToken(accessToken);

    const url = `/api/validate/signature`;

    const formData = new FormData();

    // Handle File objects (browser) vs Buffer objects (Node.js)
    if (typeof File !== 'undefined' && xmlFile instanceof File) {
      formData.append('file', xmlFile);
    } else if (xmlFile instanceof Buffer) {
      if (!xmlFileName) {
        throw new AnafValidationError('XML file name is required when uploading Buffer');
      }
      // Create Blob-like object for Node.js compatibility
      const blob = new Blob([xmlFile], { type: 'text/xml' });
      formData.append('file', blob, xmlFileName);
    } else {
      throw new AnafValidationError('Invalid XML file type. Expected File or Buffer');
    }

    if (typeof File !== 'undefined' && signatureFile instanceof File) {
      formData.append('signature', signatureFile);
    } else if (signatureFile instanceof Buffer) {
      if (!signatureFileName) {
        throw new AnafValidationError('Signature file name is required when uploading Buffer');
      }
      // Create Blob-like object for Node.js compatibility
      const blob = new Blob([signatureFile], { type: 'application/octet-stream' });
      formData.append('signature', blob, signatureFileName);
    } else {
      throw new AnafValidationError('Invalid signature file type. Expected File or Buffer');
    }

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post(url, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const responseData = response.data;

      return {
        valid: responseData.msg?.includes('validate cu succes') || false,
        details: responseData.msg || JSON.stringify(responseData),
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
   *
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document to convert
   * @param standard Document standard (FACT1 or FCN)
   * @returns PDF content as Buffer
   * @throws {AnafApiError} If conversion fails
   */
  public async convertXmlToPdf(
    accessToken: string,
    xmlContent: string,
    standard: DocumentStandardType = 'FACT1'
  ): Promise<Buffer> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);
    this.validateDocumentStandard(standard);

    const url = `/transformare/${standard}`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // The HttpClient should return ArrayBuffer for PDF content type
      if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data);
      } else {
        // Fallback for when content-type detection doesn't work
        return Buffer.from(response.data as any);
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
   * @param accessToken Valid OAuth access token
   * @param xmlContent XML document to convert
   * @param standard Document standard (FACT1 or FCN)
   * @returns PDF content as Buffer
   * @throws {AnafApiError} If conversion fails
   */
  public async convertXmlToPdfNoValidation(
    accessToken: string,
    xmlContent: string,
    standard: DocumentStandardType = 'FACT1'
  ): Promise<Buffer> {
    this.validateAccessToken(accessToken);
    this.validateXmlContent(xmlContent);
    this.validateDocumentStandard(standard);

    const url = `/transformare/${standard}/DA`;

    const { data, error } = tryCatch(async () => {
      const response = await this.httpClient.post(url, xmlContent, {
        headers: {
          'Content-Type': 'text/plain',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // The HttpClient should return ArrayBuffer for PDF content type
      if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data);
      } else {
        // Fallback for when content-type detection doesn't work
        return Buffer.from(response.data as any);
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

  private validateConfig(config: AnafEfacturaClientConfig): void {
    if (!config) {
      throw new AnafValidationError('Configuration is required');
    }

    if (!config.vatNumber?.trim()) {
      throw new AnafValidationError('VAT number is required');
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
    this.validateMessageFilter(params.filtru);
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
    this.validateMessageFilter(params.filtru);
  }

  private validateUploadOptions(options: UploadOptions): void {
    if (options.standard && !['UBL', 'CN', 'CII', 'RASP'].includes(options.standard)) {
      throw new AnafValidationError('Standard must be one of: UBL, CN, CII, RASP');
    }
  }

  private validateDocumentStandard(standard: DocumentStandardType): void {
    if (!['FACT1', 'FCN'].includes(standard)) {
      throw new AnafValidationError('Document standard must be FACT1 or FCN');
    }
  }

  private validateMessageFilter(filter?: string): void {
    if (filter && !['E', 'P', 'T', 'R'].includes(filter)) {
      throw new AnafValidationError('Message filter must be one of: E, P, T, R');
    }
  }

  private handleApiError(error: any, context: string): never {
    if (error instanceof AnafSdkError) {
      throw error;
    } else {
      throw new AnafSdkError(`${context}: ${error.message || 'Unknown error'}`);
    }
  }
}
