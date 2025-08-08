/**
 * ANAF Details Client
 *
 * Client for fetching Romanian company data from the public ANAF API.
 * This service provides company information including VAT registration status,
 * addresses, and contact details based on CUI/CIF numbers.
 *
 * @example
 * ```typescript
 * import { AnafDetailsClient } from 'efactura-ts-sdk';
 *
 * const detailsClient = new AnafDetailsClient();
 *
 * // Fetch company data by VAT code
 * const result = await detailsClient.getCompanyData('RO12345678');
 * if (result.success) {
 *   console.log('Company:', result.data[0].name);
 *   console.log('VAT registered:', result.data[0].scpTva);
 * }
 *
 * // Validate VAT code format
 * const isValid = await detailsClient.isValidVatCode('RO12345678');
 * ```
 */
import { AnafDetailsConfig, AnafCompanyResult } from './types';
/**
 * ANAF Details Client for fetching Romanian company data
 */
export declare class AnafDetailsClient {
    private readonly httpClient;
    private readonly config;
    /**
     * Create a new ANAF Details client
     *
     * @param config - Configuration options
     */
    constructor(config?: AnafDetailsConfig);
    /**
     * Get current date string in YYYY-MM-DD format
     *
     * @returns Current date string
     */
    private getCurrentDateString;
    /**
     * Extract CUI number from VAT code
     *
     * @param vatCode - VAT code (with or without RO prefix)
     * @returns Numeric CUI or null if invalid
     */
    private extractCuiNumber;
    /**
     * Transform ANAF API response to our format
     *
     * @param response - Raw ANAF API response
     * @param cui - Original CUI number
     * @returns Transformed company result
     */
    private transformResponse;
    /**
     * Get company data for a single VAT code
     *
     * @param vatCode - The VAT code (CUI/CIF) to search for
     * @returns Promise with company data or error
     *
     * @example
     * ```typescript
     * const result = await client.getCompanyData('RO12345678');
     * if (result.success) {
     *   console.log('Company name:', result.data[0].name);
     *   console.log('Address:', result.data[0].address);
     *   console.log('VAT registered:', result.data[0].scpTva);
     * } else {
     *   console.error('Error:', result.error);
     * }
     * ```
     */
    getCompanyData(vatCode: string): Promise<AnafCompanyResult>;
    /**
     * Batch fetch company data for multiple VAT codes
     *
     * @param vatCodes - Array of VAT codes to fetch
     * @returns Promise with company data or error
     *
     * @example
     * ```typescript
     * const result = await client.batchGetCompanyData(['RO12345678', 'RO87654321']);
     * if (result.success) {
     *   result.data.forEach((company, index) => {
     *     console.log(`Company ${index + 1}:`, company.name);
     *   });
     * } else {
     *   console.error('Error:', result.error);
     * }
     * ```
     */
    batchGetCompanyData(vatCodes: string[]): Promise<AnafCompanyResult>;
    /**
     * Validate if a VAT code is in the correct format for ANAF lookup
     *
     * @param vatCode - The VAT code to validate
     * @returns Promise resolving to boolean indicating if the format is valid
     *
     * @example
     * ```typescript
     * const isValid = await client.isValidVatCode('RO12345678');
     * console.log('Valid format:', isValid);
     * ```
     */
    isValidVatCode(vatCode: string): Promise<boolean>;
}
