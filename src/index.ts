/**
 * ANAF e-Factura TypeScript SDK
 * 
 * A comprehensive TypeScript SDK for interacting with the Romanian ANAF e-Factura system.
 * Provides OAuth 2.0 authentication, document upload/download, validation, and UBL generation.
 * 
 * @example
 * ```typescript
 * import { AnafClient } from 'anaf-e-factura-sdk';
 * 
 * const client = new AnafClient({
 *   clientId: 'your-oauth-client-id',
 *   clientSecret: 'your-oauth-client-secret',
 *   redirectUri: 'https://your-app.com/callback',
 *   vatNumber: 'RO12345678',
 *   testMode: true
 * });
 * 
 * // Generate and upload invoice
 * const xml = client.generateInvoiceXml(invoiceData);
 * const uploadResult = await client.uploadDocument(accessToken, xml);
 * ```
 */

// Main exports
export { AnafClient } from './AnafClient';

// Types
export * from './types';

// Errors
export * from './errors';

// UBL Builder
export * from './ubl';

// Utilities (for advanced users)
export * as Utils from './utils/xmlParser';
export * as DateUtils from './utils/dateUtils';
export * as FormUtils from './utils/formEncoder';

// Constants (for advanced users)
export * as Constants from './constants';

// Default export for convenience
export { AnafClient as default } from './AnafClient'; 