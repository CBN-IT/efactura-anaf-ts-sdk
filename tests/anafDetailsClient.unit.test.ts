import { AnafDetailsClient } from '../src/AnafDetailsClient';
import { AnafCompanyResult, AnafApiResponse } from '../src/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnafDetailsClient Unit Tests', () => {
  let client: AnafDetailsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AnafDetailsClient();
  });

  describe('Constructor and Configuration', () => {
    test('should create client with default configuration', () => {
      const defaultClient = new AnafDetailsClient();
      expect(defaultClient).toBeInstanceOf(AnafDetailsClient);

      const stats = defaultClient.getCacheStats();
      expect(stats.enabled).toBe(true);
      expect(stats.size).toBe(0);
    });

    test('should create client with custom configuration', () => {
      const customClient = new AnafDetailsClient({
        timeout: 60000,
        enableCache: false,
        cacheTtl: 600000,
      });

      const stats = customClient.getCacheStats();
      expect(stats.enabled).toBe(false);
    });
  });

  describe('VAT Code Validation', () => {
    test('should validate correct VAT codes', async () => {
      expect(await client.isValidVatCode('RO12345678')).toBe(true);
      expect(await client.isValidVatCode('12345678')).toBe(true);
      expect(await client.isValidVatCode('RO123')).toBe(true);
      expect(await client.isValidVatCode('1234567890')).toBe(true);
    });

    test('should reject invalid VAT codes', async () => {
      expect(await client.isValidVatCode('')).toBe(false);
      expect(await client.isValidVatCode('RO')).toBe(false);
      expect(await client.isValidVatCode('ROABC')).toBe(false);
      expect(await client.isValidVatCode('12345678901')).toBe(false); // Too long
      expect(await client.isValidVatCode('0')).toBe(false); // Zero
      expect(await client.isValidVatCode('-123')).toBe(false); // Negative
    });
  });

  describe('Company Data Fetching', () => {
    const mockSuccessResponse: AnafApiResponse = {
      found: [
        {
          date_generale: {
            cui: 12345678,
            denumire: 'Test Company SRL',
            adresa: 'Str. Test Nr. 1, Bucuresti',
            nrRegCom: 'J40/1234/2020',
            telefon: '0212345678',
            codPostal: '010101',
          },
          inregistrare_scop_Tva: {
            scpTVA: true,
          },
        },
      ],
    };

    const mockNotFoundResponse: AnafApiResponse = {
      notFound: [{ cui: 99999999 }],
    };

    test('should fetch company data successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const result = await client.getCompanyData('RO12345678');

      expect(result.success).toBe(true);
      expect(result.data?.[0]).toEqual({
        vatCode: '12345678',
        name: 'Test Company SRL',
        registrationNumber: 'J40/1234/2020',
        address: 'Str. Test Nr. 1, Bucuresti',
        postalCode: '010101',
        contactPhone: '0212345678',
        scpTva: true,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('12345678'),
        })
      );
    });

    test('should handle company not found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockNotFoundResponse),
      });

      const result = await client.getCompanyData('RO99999999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Company not found for the provided VAT code.');
    });

    test('should handle invalid VAT code format', async () => {
      const result = await client.getCompanyData('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid CUI format. Please provide the numeric part.');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle empty VAT code', async () => {
      const result = await client.getCompanyData('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid VAT code provided.');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('fetch failed'));

      const result = await client.getCompanyData('RO12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error: Could not connect to ANAF service.');
    });

    test('should handle API errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await client.getCompanyData('RO12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while contacting the ANAF service.');
    });

    test('should handle unexpected response structure', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve({}),
      });

      const result = await client.getCompanyData('RO12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected response structure from ANAF API: {}');
    });
  });

  describe('Caching', () => {
    const mockResponse: AnafApiResponse = {
      found: [
        {
          date_generale: {
            cui: 12345678,
            denumire: 'Cached Company SRL',
            adresa: 'Cached Address',
            nrRegCom: 'J40/5678/2020',
            telefon: '0212345678',
            codPostal: '010101',
          },
          inregistrare_scop_Tva: {
            scpTVA: false,
          },
        },
      ],
    };

    test('should cache successful responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse),
      });

      // First call
      const result1 = await client.getCompanyData('RO12345678');
      expect(result1.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await client.getCompanyData('RO12345678');
      expect(result2.success).toBe(true);
      expect(result2.data?.[0]?.name).toBe('Cached Company SRL');
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call

      const stats = client.getCacheStats();
      expect(stats.size).toBe(1);
    });

    test('should cache error responses', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // First call
      const result1 = await client.getCompanyData('RO12345678');
      expect(result1.success).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cached error
      const result2 = await client.getCompanyData('RO12345678');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Network error');
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    test('should clear cache', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse),
      });

      await client.getCompanyData('RO12345678');
      expect(client.getCacheStats().size).toBe(1);

      client.clearCache();
      expect(client.getCacheStats().size).toBe(0);
    });

    test('should work with cache disabled', async () => {
      const noCacheClient = new AnafDetailsClient({ enableCache: false });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse),
      });

      // First call
      await noCacheClient.getCompanyData('RO12345678');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should make another API request
      await noCacheClient.getCompanyData('RO12345678');
      expect(fetch).toHaveBeenCalledTimes(2);

      const stats = noCacheClient.getCacheStats();
      expect(stats.enabled).toBe(false);
      expect(stats.size).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    const mockResponse1: AnafApiResponse = {
      found: [
        {
          date_generale: {
            cui: 11111111,
            denumire: 'Company One SRL',
            adresa: 'Address One',
            nrRegCom: 'J40/1111/2020',
            telefon: '0211111111',
            codPostal: '010101',
          },
          inregistrare_scop_Tva: { scpTVA: true },
        },
      ],
    };

    const mockResponse2: AnafApiResponse = {
      found: [
        {
          date_generale: {
            cui: 22222222,
            denumire: 'Company Two SRL',
            adresa: 'Address Two',
            nrRegCom: 'J40/2222/2020',
            telefon: '0212222222',
            codPostal: '020202',
          },
          inregistrare_scop_Tva: { scpTVA: false },
        },
      ],
    };

    const mockNotFound: AnafApiResponse = {
      notFound: [{ cui: 99999999 }],
    };

    test('should batch fetch multiple companies', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(mockResponse1),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(mockResponse2),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(mockNotFound),
        });

      const results = await client.batchGetCompanyData(['RO11111111', 'RO22222222', 'RO99999999']);

      expect(results).toHaveLength(3);

      expect(results[0].success).toBe(true);
      expect(results[0].data?.[0]?.name).toBe('Company One SRL');

      expect(results[1].success).toBe(true);
      expect(results[1].data?.[0]?.name).toBe('Company Two SRL');

      expect(results[2].success).toBe(false);
      expect(results[2].error).toBe('Company not found for the provided VAT code.');
    });

    test('should handle batch with custom options', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse1),
      });

      const startTime = Date.now();
      await client.batchGetCompanyData(['RO11111111', 'RO22222222'], {
        concurrency: 1,
        delayMs: 100,
      });
      const endTime = Date.now();

      // Should take at least 100ms due to delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle VAT codes with different formats', async () => {
      const mockResponse: AnafApiResponse = {
        found: [
          {
            date_generale: {
              cui: 123,
              denumire: 'Short CUI Company',
              adresa: 'Test Address',
              nrRegCom: 'J40/123/2020',
              telefon: '0211234567',
              codPostal: null,
            },
            inregistrare_scop_Tva: { scpTVA: false },
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse),
      });

      // Test with different VAT code formats
      const result1 = await client.getCompanyData('RO123');
      const result2 = await client.getCompanyData('123');
      const result3 = await client.getCompanyData('  RO123  ');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(result1.data?.[0]?.vatCode).toBe('123');
      expect(result1.data?.[0]?.postalCode).toBe(null);
    });

    test('should handle missing optional fields', async () => {
      const mockResponse: AnafApiResponse = {
        found: [
          {
            date_generale: {
              cui: 12345678,
              denumire: 'Minimal Company',
              adresa: 'Minimal Address',
              nrRegCom: '',
              telefon: '',
              codPostal: null,
            },
            inregistrare_scop_Tva: { scpTVA: false },
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getCompanyData('RO12345678');

      expect(result.success).toBe(true);
      expect(result.data?.[0]?.name).toBe('Minimal Company');
      expect(result.data?.[0]?.registrationNumber).toBe('');
      expect(result.data?.[0]?.contactPhone).toBe('');
      expect(result.data?.[0]?.postalCode).toBe(null);
      expect(result.data?.[0]?.scpTva).toBe(false);
    });
  });
});
