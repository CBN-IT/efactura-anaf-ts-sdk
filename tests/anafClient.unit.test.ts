import { AnafEfacturaClient } from '../src';
import { AnafValidationError, AnafApiError, AnafAuthenticationError } from '../src/errors';
import { UploadOptions, PaginatedMessagesParams, ListMessagesParams, DocumentStandardType } from '../src/types';
import { mockTestData } from './testUtils';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnafEfacturaClient Unit Tests', () => {
  let client: AnafEfacturaClient;
  const mockAccessToken = 'mock_access_token_12345';
  const mockVatNumber = 'RO12345678';

  beforeEach(() => {
    jest.clearAllMocks();

    client = new AnafEfacturaClient({
      vatNumber: mockVatNumber,
      testMode: true,
      timeout: 3000,
    });
  });

  describe('Constructor and Configuration', () => {
    test('should create client with valid configuration', () => {
      expect(client).toBeDefined();
    });

    test('should throw error for missing VAT number', () => {
      expect(() => {
        new AnafEfacturaClient({ vatNumber: '' });
      }).toThrow(AnafValidationError);
    });

    test('should throw error for null configuration', () => {
      expect(() => {
        new AnafEfacturaClient(null as any);
      }).toThrow(AnafValidationError);
    });

    test('should use test mode base path', () => {
      const testClient = new AnafEfacturaClient({
        vatNumber: mockVatNumber,
        testMode: true,
      });
      expect(testClient).toBeDefined();
    });

    test('should use production mode base path', () => {
      const prodClient = new AnafEfacturaClient({
        vatNumber: mockVatNumber,
        testMode: false,
      });
      expect(prodClient).toBeDefined();
    });
  });

  describe('Document Upload', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/xml' : null),
        },
        text: () => Promise.resolve(mockTestData.mockXmlResponses.uploadSuccess),
      });
    });

    test('should upload document successfully', async () => {
      const options: UploadOptions = {
        standard: 'UBL',
        executare: true,
      };

      const result = await client.uploadDocument(mockAccessToken, xmlContent, options);

      expect(result).toBeDefined();
      expect(result.index_incarcare).toBe('12345');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          body: xmlContent,
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    test('should upload B2C document successfully', async () => {
      const result = await client.uploadB2CDocument(mockAccessToken, xmlContent);

      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/uploadb2c'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('should validate access token before upload', async () => {
      await expect(client.uploadDocument('', xmlContent)).rejects.toThrow(AnafValidationError);

      await expect(client.uploadDocument('   ', xmlContent)).rejects.toThrow(AnafValidationError);
    });

    test('should validate XML content before upload', async () => {
      await expect(client.uploadDocument(mockAccessToken, '')).rejects.toThrow(AnafValidationError);

      await expect(client.uploadDocument(mockAccessToken, '   ')).rejects.toThrow(AnafValidationError);
    });

    test('should validate upload options', async () => {
      // Test invalid standard
      await expect(client.uploadDocument(mockAccessToken, xmlContent, { standard: 'INVALID' as any })).rejects.toThrow(
        AnafValidationError
      );
    });

    test('should handle upload errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow();
    });

    test('should handle 401 authentication errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/plain' : null),
        },
        text: () => Promise.resolve('Invalid token'),
      });

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow(AnafAuthenticationError);
    });
  });

  describe('Status and Download Operations', () => {
    const mockUploadId = '12345';
    const mockDownloadId = '67890';
    const mockDownloadContent = 'Mock ZIP file content';

    test('should get upload status successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/xml' : null),
        },
        text: () => Promise.resolve(mockTestData.mockXmlResponses.statusSuccess),
      });

      const result = await client.getUploadStatus(mockAccessToken, mockUploadId);

      expect(result).toBeDefined();
      expect(result.stare).toBe('ok');
      expect(result.id_descarcare).toBe('67890');
    });

    test('should download document successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/zip' : null),
        },
        text: () => Promise.resolve(mockDownloadContent),
      });

      const result = await client.downloadDocument(mockAccessToken, mockDownloadId);

      expect(result).toBe(mockDownloadContent);
    });

    test('should validate upload ID for status check', async () => {
      await expect(client.getUploadStatus(mockAccessToken, '')).rejects.toThrow(AnafValidationError);
    });

    test('should validate download ID for download', async () => {
      await expect(client.downloadDocument(mockAccessToken, '')).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Message Listing', () => {
    test('should get messages successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockTestData.mockJsonResponses.messagesSuccess),
      });

      const result = await client.getMessages(mockAccessToken, { zile: 7 });

      expect(result).toBeDefined();
      expect(result.mesaje).toBeDefined();
      expect(result.mesaje?.length).toBe(2);
    });

    test('should get paginated messages successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockTestData.mockJsonResponses.messagesSuccess),
      });

      const params: PaginatedMessagesParams = {
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        endTime: Date.now(),
        pagina: 1,
        filtru: 'T',
      };

      const result = await client.getMessagesPaginated(mockAccessToken, params);

      expect(result).toBeDefined();
      expect(result.mesaje).toBeDefined();
    });

    test('should validate message listing parameters', async () => {
      await expect(client.getMessages(mockAccessToken, { zile: 0 })).rejects.toThrow(AnafValidationError);

      await expect(client.getMessages(mockAccessToken, { zile: 100 })).rejects.toThrow(AnafValidationError);
    });

    test('should validate paginated message parameters', async () => {
      const invalidParams: PaginatedMessagesParams = {
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        endTime: Date.now(),
        pagina: 0,
        filtru: 'T',
      };

      await expect(client.getMessagesPaginated(mockAccessToken, invalidParams)).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Validation Operations', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

    test('should validate XML successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockTestData.mockJsonResponses.validationSuccess),
      });

      const result = await client.validateXml(mockAccessToken, xmlContent, 'FACT1');

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should validate XML with default standard', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve(mockTestData.mockJsonResponses.validationSuccess),
      });

      const result = await client.validateXml(mockAccessToken, xmlContent);

      expect(result).toBeDefined();
    });

    test('should validate document standard parameter', async () => {
      await expect(client.validateXml(mockAccessToken, xmlContent, 'INVALID' as any)).rejects.toThrow(
        AnafValidationError
      );
    });

    test('should validate signature with File objects', async () => {
      const mockXmlFile = new File(['xml content'], 'test.xml', { type: 'text/xml' });
      const mockSigFile = new File(['sig content'], 'test.sig', {
        type: 'application/pkcs7-signature',
      });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve({ msg: 'Fișierele încărcate au fost validate cu succes' }),
      });

      const result = await client.validateSignature(mockAccessToken, mockXmlFile, mockSigFile);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should validate signature with Buffer objects', async () => {
      const mockXmlBuffer = Buffer.from('xml content');
      const mockSigBuffer = Buffer.from('sig content');

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve({ msg: 'Fișierele încărcate au fost validate cu succes' }),
      });

      const result = await client.validateSignature(
        mockAccessToken,
        mockXmlBuffer,
        mockSigBuffer,
        'test.xml',
        'test.sig'
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should require file names for Buffer uploads', async () => {
      const mockBuffer = Buffer.from('content');

      await expect(client.validateSignature(mockAccessToken, mockBuffer, mockBuffer)).rejects.toThrow(
        AnafValidationError
      );
    });
  });

  describe('PDF Conversion', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';
    const mockPdfContent = 'Mock PDF content';
    const mockPdfBuffer = Buffer.from(mockPdfContent);

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/pdf' : null),
        },
        arrayBuffer: () =>
          Promise.resolve(
            mockPdfBuffer.buffer.slice(mockPdfBuffer.byteOffset, mockPdfBuffer.byteOffset + mockPdfBuffer.byteLength)
          ),
      });
    });

    test('should convert XML to PDF with validation', async () => {
      const result = await client.convertXmlToPdf(mockAccessToken, xmlContent, 'FACT1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Mock PDF content');
    });

    test('should convert XML to PDF without validation', async () => {
      const result = await client.convertXmlToPdfNoValidation(mockAccessToken, xmlContent, 'FCN');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Mock PDF content');
    });

    test('should validate standard for PDF conversion', async () => {
      await expect(
        client.convertXmlToPdf(mockAccessToken, xmlContent, 'INVALID' as DocumentStandardType)
      ).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Error Handling', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

    test('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow();
    });

    test('should handle 400 validation errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/plain' : null),
        },
        text: () => Promise.resolve('Invalid parameters'),
      });

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow(AnafValidationError);
    });

    test('should handle 401 authentication errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/plain' : null),
        },
        text: () => Promise.resolve('Invalid token'),
      });

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow(AnafAuthenticationError);
    });

    test('should handle 500 server errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/plain' : null),
        },
        text: () => Promise.resolve('Server error'),
      });

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow(AnafApiError);
    });

    test('should handle XML parsing errors in responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/xml' : null),
        },
        text: () => Promise.resolve('This is not valid XML at all - no tags or structure'),
      });

      await expect(client.uploadDocument(mockAccessToken, xmlContent)).rejects.toThrow();
    });
  });

  describe('Parameter Validation', () => {
    test('should validate all enum parameters correctly', async () => {
      const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

      // Test upload standard validation
      await expect(client.uploadDocument(mockAccessToken, xmlContent, { standard: 'INVALID' as any })).rejects.toThrow(
        AnafValidationError
      );

      // Test document standard validation
      await expect(client.validateXml(mockAccessToken, xmlContent, 'INVALID' as any)).rejects.toThrow(
        AnafValidationError
      );

      // Test message filter validation
      await expect(client.getMessages(mockAccessToken, { zile: 7, filtru: 'INVALID' as any })).rejects.toThrow(
        AnafValidationError
      );
    });

    test('should accept valid enum values', async () => {
      const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

      // Valid upload standards
      for (const standard of ['UBL', 'CN', 'CII', 'RASP']) {
        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'text/xml' : null),
          },
          text: () => Promise.resolve(mockTestData.mockXmlResponses.uploadSuccess),
        });

        await expect(
          client.uploadDocument(mockAccessToken, xmlContent, { standard: standard as any })
        ).resolves.toBeDefined();
      }

      // Valid document standards
      for (const standard of ['FACT1', 'FCN']) {
        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(mockTestData.mockJsonResponses.validationSuccess),
        });

        await expect(client.validateXml(mockAccessToken, xmlContent, standard as any)).resolves.toBeDefined();
      }

      // Valid message filters
      for (const filter of ['E', 'P', 'T', 'R']) {
        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(mockTestData.mockJsonResponses.messagesSuccess),
        });

        await expect(client.getMessages(mockAccessToken, { zile: 7, filtru: filter as any })).resolves.toBeDefined();
      }
    });
  });
});
