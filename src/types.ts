/**
 * Configuration for ANAF OAuth 2.0 authentication
 */
export interface AnafAuthConfig {
  /** OAuth 2.0 client ID obtained from ANAF SPV */
  clientId: string;
  /** OAuth 2.0 client secret obtained from ANAF SPV */
  clientSecret: string;
  /** OAuth 2.0 redirect URI registered with ANAF */
  redirectUri: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Configuration for ANAF e-Factura client
 *
 * @example
 * ```typescript
 * const config: AnafClientConfig = {
 *   vatNumber: 'RO12345678',
 *   testMode: true
 * };
 * ```
 */
export interface AnafClientConfig {
  /** Romanian VAT number (CIF) in format RO12345678 */
  vatNumber: string;
  /** Whether to use test environment (default: false) */
  testMode?: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional axios configuration */
  axiosOptions?: any;
  /** Custom base path (overrides default) */
  basePath?: string;
}

/**
 * OAuth 2.0 token response from ANAF
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Simplified token interface for easier usage
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

/**
 * Standard document types supported by ANAF e-Factura
 */
export type StandardType = 'UBL' | 'CN' | 'CII' | 'RASP';

/**
 * Document standards for validation and PDF conversion
 */
export type DocumentStandardType = 'FACT1' | 'FCN';

/**
 * Upload options for document submission
 */
export interface UploadOptions {
  /** Document standard (default: 'UBL') */
  standard?: StandardType;
  /** Whether this is an external invoice */
  extern?: boolean;
  /** Whether this is a self-invoice (autofactura) */
  autofactura?: boolean;
  /** Whether to execute the operation immediately */
  executare?: boolean;
}

/**
 * Response from upload and status check operations
 */
export interface UploadStatus {
  /** Upload ID for status checking */
  index_incarcare?: string;
  /** Download ID for retrieving results */
  id_descarcare?: string;
  /** Current status: 'ok', 'nok', 'in prelucrare' */
  stare?: string;
  /** Error message if applicable */
  eroare?: string;
  /** Additional message from ANAF */
  mesaj?: string;
  /** Alternative error structure */
  Error?: { mesaj: string };
}

/**
 * Message filters for listing operations
 */
export type MessageFilter = 'E' | 'T' | 'P' | 'R';

/**
 * Parameters for listing messages
 */
export interface ListMessagesParams {
  /** Number of days to query (1-60) */
  zile: number;
  /** Message filter type */
  filtru?: MessageFilter;
}

/**
 * Parameters for paginated message listing
 */
export interface PaginatedMessagesParams {
  /** Start time (Unix timestamp in milliseconds) */
  startTime: number;
  /** End time (Unix timestamp in milliseconds) */
  endTime: number;
  /** Page number */
  pagina: number;
  /** Message filter type */
  filtru?: MessageFilter;
}

/**
 * Individual message details
 */
export interface MessageDetails {
  /** Request ID */
  id_solicitare: string;
  /** Message type */
  tip: string;
  /** Creation date */
  data_creare: string;
  /** Download ID */
  id: string;
  /** Message details */
  detalii: string;
  /** Sender VAT number */
  cif_emitent?: string;
  /** Beneficiary VAT number */
  cif_beneficiar?: string;
  /** VAT number for downloadable response */
  cif?: string;
}

/**
 * Response from message listing operations
 */
export interface ListMessagesResponse {
  /** Array of messages */
  mesaje?: MessageDetails[];
  /** Error message if applicable */
  eroare?: string;
  /** Serial number */
  serial?: string;
  /** Response title */
  titlu?: string;
  /** Additional info */
  info?: string;
  /** Download error message */
  eroare_descarcare?: string;
}

/**
 * Validation result for XML documents
 */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean;
  /** Validation details or error messages */
  details: string;
  /** Additional validation info */
  info?: string;
}

/**
 * Address information for UBL parties
 */
export interface Address {
  /** Street address */
  street: string;
  /** City name */
  city: string;
  /** Postal code */
  postalZone: string;
  /** County/Region (optional) */
  county?: string;
  /** Country code (default: 'RO') */
  countryCode?: string;
}

/**
 * Party information for suppliers and customers
 */
export interface Party {
  /** Company registration name */
  registrationName: string;
  /** Company ID (CIF/CUI) */
  companyId: string;
  /** VAT number (e.g., RO12345678) */
  vatNumber?: string;
  /** Company address */
  address: Address;
}

/**
 * Invoice line item
 */
export interface InvoiceLine {
  /** Line ID (optional, will be auto-generated) */
  id?: string | number;
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit of measure code (default: 'EA') */
  unitCode?: string;
  /** Unit price excluding VAT */
  unitPrice: number;
  /** VAT percentage (default: 0) */
  taxPercent?: number;
}

/**
 * Complete invoice data for UBL generation
 */
export interface InvoiceInput {
  /** Invoice number */
  invoiceNumber: string;
  /** Issue date */
  issueDate: string | Date;
  /** Due date (optional, defaults to issue date) */
  dueDate?: string | Date;
  /** Currency code (default: 'RON') */
  currency?: string;
  /** Supplier information */
  supplier: Party;
  /** Customer information */
  customer: Party;
  /** Invoice line items */
  lines: InvoiceLine[];
  /** Payment IBAN (optional) */
  paymentIban?: string;
  /** Whether supplier is VAT registered */
  isSupplierVatPayer?: boolean;
}

/**
 * Legacy interface for backward compatibility
 */
export interface UblInvoiceInput extends InvoiceInput {
  isSupplierVatPayer: boolean;
}

/**
 * Legacy interfaces for backward compatibility
 */
export interface UblAddress extends Address {}
export interface UblParty extends Party {
  vatIdentifier?: string;
}
export interface UblInvoiceLine extends InvoiceLine {}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error message */
  eroare?: string;
  /** Additional message */
  mesaj?: string;
  /** Error details */
  detalii?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data?: T;
  /** Success indicator */
  success: boolean;
  /** Error information */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}
