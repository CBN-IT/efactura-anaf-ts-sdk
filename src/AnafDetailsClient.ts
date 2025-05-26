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
 *   console.log('Company:', result.data.name);
 *   console.log('VAT registered:', result.data.scpTva);
 * }
 *
 * // Validate VAT code format
 * const isValid = await detailsClient.isValidVatCode('RO12345678');
 * ```
 */

import { HttpClient } from './utils/httpClient';
import { tryCatch } from './tryCatch';
import { AnafValidationError, AnafApiError, AnafNotFoundError } from './errors';
import { AnafDetailsConfig, AnafCompanyData, AnafCompanyResult, AnafRequestPayload, AnafApiResponse } from './types';
import type { HttpResponse } from './utils/httpClient';

/**
 * Default configuration for ANAF Details client
 */
const DEFAULT_CONFIG: Required<AnafDetailsConfig> = {
  timeout: 30000,
  enableCache: true,
  cacheTtl: 300000, // 5 minutes
};

/**
 * ANAF Details Client for fetching Romanian company data
 */
export class AnafDetailsClient {
  private readonly httpClient: HttpClient;
  private readonly config: Required<AnafDetailsConfig>;
  private readonly cache: Map<string, { data: AnafCompanyResult; timestamp: number }>;

  /**
   * Create a new ANAF Details client
   *
   * @param config - Configuration options
   */
  constructor(config: AnafDetailsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.httpClient = new HttpClient({
      timeout: this.config.timeout,
    });
    this.cache = new Map();
  }

  /**
   * Get current date string in YYYY-MM-DD format
   *
   * @returns Current date string
   */
  private getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract CUI number from VAT code
   *
   * @param vatCode - VAT code (with or without RO prefix)
   * @returns Numeric CUI or null if invalid
   */
  private extractCuiNumber(vatCode: string): number | null {
    if (!vatCode || typeof vatCode !== 'string') {
      return null;
    }

    // Remove RO prefix if present and extract numeric part
    const cuiString = vatCode.trim().toUpperCase().replace(/^RO/i, '');
    const cuiNumber = parseInt(cuiString, 10);

    if (isNaN(cuiNumber) || cuiNumber <= 0) {
      return null;
    }

    return cuiNumber;
  }

  /**
   * Get cache key for a CUI number
   *
   * @param cui - CUI number
   * @returns Cache key
   */
  private getCacheKey(cui: number): string {
    return `anaf_company_${cui}`;
  }

  /**
   * Check if cached data is still valid
   *
   * @param timestamp - Cache timestamp
   * @returns Whether cache is valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.cacheTtl;
  }

  /**
   * Get cached company data if available and valid
   *
   * @param cui - CUI number
   * @returns Cached result or null
   */
  private getCachedData(cui: number): AnafCompanyResult | null {
    if (!this.config.enableCache) {
      return null;
    }

    const cacheKey = this.getCacheKey(cui);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache company data
   *
   * @param cui - CUI number
   * @param data - Company result to cache
   */
  private setCachedData(cui: number, data: AnafCompanyResult): void {
    if (!this.config.enableCache) {
      return;
    }

    const cacheKey = this.getCacheKey(cui);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Transform ANAF API response to our format
   *
   * @param response - Raw ANAF API response
   * @param cui - Original CUI number
   * @returns Transformed company result
   */
  private transformResponse(response: AnafApiResponse, cui: number): AnafCompanyResult {
    const data: AnafCompanyData[] = [];
    if (response.found) {
      response.found.forEach((element) => {
        data.push({
          vatCode: element.date_generale.cui.toString(),
          name: element.date_generale.denumire,
          registrationNumber: element.date_generale.nrRegCom,
          address: element.date_generale.adresa,
          postalCode: element.date_generale.codPostal,
          contactPhone: element.date_generale.telefon,
          scpTva: element.inregistrare_scop_Tva.scpTVA || false,
        });
      });

      return {
        success: true,
        data,
      };
    }

    if (response.notFound) {
      return {
        success: false,
        error: 'Company not found for the provided VAT code.',
      };
    } else {
      return {
        success: false,
        error: 'Unexpected response structure from ANAF API: ' + JSON.stringify(response),
      };
    }
  }

  /**
   * Fetch company data from ANAF API
   *
   * @param vatCode - The VAT code (CUI/CIF) to search for
   * @returns Promise with company data or error
   *
   * @example
   * ```typescript
   * const result = await client.getCompanyData('RO12345678');
   * if (result.success) {
   *   console.log('Company name:', result.data.name);
   *   console.log('Address:', result.data.address);
   *   console.log('VAT registered:', result.data.scpTva);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   */
  async getCompanyData(vatCode: string): Promise<AnafCompanyResult> {
    // Basic validation
    if (!vatCode || vatCode.trim().length < 2) {
      return { success: false, error: 'Invalid VAT code provided.' };
    }

    // Extract CUI number
    const cuiNumber = this.extractCuiNumber(vatCode);
    if (!cuiNumber) {
      return {
        success: false,
        error: 'Invalid CUI format. Please provide the numeric part.',
      };
    }

    // Check cache first
    const cachedResult = this.getCachedData(cuiNumber);
    if (cachedResult) {
      return cachedResult;
    }

    const requestDate = this.getCurrentDateString();
    const requestPayload: AnafRequestPayload[] = [
      {
        cui: cuiNumber,
        data: requestDate,
      },
    ];

    console.log(`ANAF Details: Calling ANAF API for CUI: ${cuiNumber}, Date: ${requestDate}`);

    const { data, error } = await tryCatch(
      this.httpClient.post<AnafApiResponse>('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', requestPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    if (error) {
      console.error(`Error calling ANAF API for CUI ${cuiNumber}:`, error);
      if (error instanceof AnafNotFoundError) {
        const notFoundError = {
          success: false as const,
          error: 'Company not found for the provided VAT code.',
        };
        this.setCachedData(cuiNumber, notFoundError);
        return notFoundError;
      }

      // Distinguish network errors from other errors
      if (error.message?.includes('fetch') || error.message?.toLowerCase().includes('network')) {
        const networkError = {
          success: false as const,
          error: 'Network error: Could not connect to ANAF service.',
        };
        this.setCachedData(cuiNumber, networkError);
        return networkError;
      }

      const apiError = {
        success: false as const,
        error: 'An unexpected error occurred while contacting the ANAF service.',
      };
      this.setCachedData(cuiNumber, apiError);
      return apiError;
    }

    if (!data) {
      const noResultError = {
        success: false as const,
        error: 'No response received from ANAF API.',
      };
      this.setCachedData(cuiNumber, noResultError);
      return noResultError;
    }

    console.log('ANAF API successful response for CUI:', cuiNumber);

    const transformedResult = this.transformResponse(data.data, cuiNumber);
    this.setCachedData(cuiNumber, transformedResult);

    return transformedResult;
  }

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
  async isValidVatCode(vatCode: string): Promise<boolean> {
    if (!vatCode) return false;

    // Remove RO prefix if present and check if remaining is numeric
    const cleanVatCode = vatCode.trim().toUpperCase().replace(/^RO/i, '');
    const cuiNumber = parseInt(cleanVatCode, 10);

    return !isNaN(cuiNumber) && cleanVatCode.length >= 2 && cleanVatCode.length <= 10 && cuiNumber > 0;
  }

  /**
   * Clear the internal cache
   *
   * @example
   * ```typescript
   * client.clearCache();
   * ```
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   *
   * @example
   * ```typescript
   * const stats = client.getCacheStats();
   * console.log(`Cache entries: ${stats.size}`);
   * ```
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.config.enableCache,
    };
  }

  /**
   * Batch fetch company data for multiple VAT codes
   *
   * @param vatCodes - Array of VAT codes to fetch
   * @param options - Batch options
   * @returns Promise with array of results
   *
   * @example
   * ```typescript
   * const results = await client.batchGetCompanyData(['RO12345678', 'RO87654321']);
   * results.forEach((result, index) => {
   *   if (result.success) {
   *     console.log(`Company ${index + 1}:`, result.data.name);
   *   }
   * });
   * ```
   */
  async batchGetCompanyData(
    vatCodes: string[],
    options: { concurrency?: number; delayMs?: number } = {}
  ): Promise<AnafCompanyResult[]> {
    const { concurrency = 3, delayMs = 1000 } = options;
    const results: AnafCompanyResult[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < vatCodes.length; i += concurrency) {
      const batch = vatCodes.slice(i, i + concurrency);
      const batchPromises = batch.map((vatCode) => this.getCompanyData(vatCode));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + concurrency < vatCodes.length && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
