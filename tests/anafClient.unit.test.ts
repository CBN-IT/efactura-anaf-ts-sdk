import axios from 'axios';
import { AnafClient } from '../src/AnafClient';
import { 
  AnafValidationError, 
  AnafApiError, 
  AnafAuthenticationError 
} from '../src/errors';
import { 
  UploadOptions, 
  PaginatedMessagesParams, 
  ListMessagesParams,
  DocumentStandardType 
} from '../src/types';
import { mockTestData } from './testUtils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AnafClient Unit Tests', () => {
  let client: AnafClient;
  const mockAccessToken = 'mock_access_token_12345';
  const mockVatNumber = 'RO12345678';

  // Helper function to create proper axios errors
  const createAxiosError = (status: number, message: string, data?: any) => {
    const error = new Error(message) as any;
    
    // Set all the properties that axios.isAxiosError() checks for
    error.isAxiosError = true;
    error.config = {};
    error.request = {};
    error.response = {
      status,
      statusText: message,
      data: data || message,
      headers: {},
      config: {}
    };
    error.toJSON = () => ({
      message: error.message,
      name: error.name,
      stack: error.stack,
      config: error.config,
      code: error.code,
      status: error.response?.status
    });
    
    return error;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mocked instance
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    } as any);

    client = new AnafClient({
      vatNumber: mockVatNumber,
      testMode: true
    });
  });

  describe('Constructor and Configuration', () => {
    test('should create client with valid configuration', () => {
      expect(client).toBeDefined();
    });

    test('should throw error for missing VAT number', () => {
      expect(() => {
        new AnafClient({ vatNumber: '' });
      }).toThrow(AnafValidationError);
    });

    test('should throw error for null configuration', () => {
      expect(() => {
        new AnafClient(null as any);
      }).toThrow(AnafValidationError);
    });

    test('should use test mode base path', () => {
      const testClient = new AnafClient({
        vatNumber: mockVatNumber,
        testMode: true
      });
      expect(testClient).toBeDefined();
    });

    test('should use production mode base path', () => {
      const prodClient = new AnafClient({
        vatNumber: mockVatNumber,
        testMode: false
      });
      expect(prodClient).toBeDefined();
    });
  });

  describe('Document Upload', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

    beforeEach(() => {
      // Mock the HTTP client instance that was created by axios.create
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockResolvedValue({
        data: mockTestData.mockXmlResponses.uploadSuccess
      });
    });

    test('should upload document successfully', async () => {
      const options: UploadOptions = {
        standard: 'UBL',
        executare: true
      };

      const result = await client.uploadDocument(mockAccessToken, xmlContent, options);

      expect(result).toBeDefined();
      expect(result.index_incarcare).toBe('12345');
    });

    test('should upload B2C document successfully', async () => {
      const result = await client.uploadB2CDocument(mockAccessToken, xmlContent);

      expect(result).toBeDefined();
    });

    test('should validate access token before upload', async () => {
      await expect(
        client.uploadDocument('', xmlContent)
      ).rejects.toThrow(AnafValidationError);

      await expect(
        client.uploadDocument('   ', xmlContent)
      ).rejects.toThrow(AnafValidationError);
    });

    test('should validate XML content before upload', async () => {
      await expect(
        client.uploadDocument(mockAccessToken, '')
      ).rejects.toThrow(AnafValidationError);

      await expect(
        client.uploadDocument(mockAccessToken, '   ')
      ).rejects.toThrow(AnafValidationError);
    });

    test('should validate upload options', async () => {
      // Test invalid standard
      await expect(
        client.uploadDocument(mockAccessToken, xmlContent, { standard: 'INVALID' as any })
      ).rejects.toThrow(AnafValidationError);
    });

    test('should handle upload errors gracefully', async () => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow();
    });

    test('should handle 401 authentication errors', async () => {
      const mockHttpClient = (client as any).httpClient;
      const error = createAxiosError(401, 'Unauthorized');
      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow(AnafAuthenticationError);
    });
  });

  describe('Status and Download Operations', () => {
    const mockUploadId = '12345';
    const mockDownloadId = '67890';
    const mockDownloadContent = 'Mock ZIP file content';

    beforeEach(() => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.get.mockImplementation((url: string) => {
        if (url.includes('/stareMesaj')) {
          return Promise.resolve({ data: mockTestData.mockXmlResponses.statusSuccess });
        } else if (url.includes('/descarcare')) {
          return Promise.resolve({ data: mockDownloadContent });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    test('should get upload status successfully', async () => {
      const result = await client.getUploadStatus(mockAccessToken, mockUploadId);

      expect(result).toBeDefined();
      expect(result.stare).toBe('ok');
      expect(result.id_descarcare).toBe('67890');
    });

    test('should download document successfully', async () => {
      const result = await client.downloadDocument(mockAccessToken, mockDownloadId);

      expect(result).toBe(mockDownloadContent);
    });

    test('should validate upload ID for status check', async () => {
      await expect(
        client.getUploadStatus(mockAccessToken, '')
      ).rejects.toThrow(AnafValidationError);
    });

    test('should validate download ID for download', async () => {
      await expect(
        client.downloadDocument(mockAccessToken, '')
      ).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Message Listing', () => {
    beforeEach(() => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.get.mockResolvedValue({
        data: mockTestData.mockJsonResponses.messagesSuccess
      });
    });

    test('should get messages successfully', async () => {
      const params: ListMessagesParams = {
        zile: 7,
        filtru: 'E'
      };

      const result = await client.getMessages(mockAccessToken, params);

      expect(result).toBeDefined();
      expect(result.mesaje).toHaveLength(2);
      expect(result.mesaje![0].tip).toBe('FACTURA TRIMISA');
    });

    test('should get paginated messages successfully', async () => {
      const params: PaginatedMessagesParams = {
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        endTime: Date.now(),
        pagina: 1,
        filtru: 'T'
      };

      const result = await client.getMessagesPaginated(mockAccessToken, params);

      expect(result).toBeDefined();
      expect(result.mesaje).toHaveLength(2);
    });

    test('should validate message listing parameters', async () => {
      // Invalid days parameter
      await expect(
        client.getMessages(mockAccessToken, { zile: 0 })
      ).rejects.toThrow(AnafValidationError);

      await expect(
        client.getMessages(mockAccessToken, { zile: 61 })
      ).rejects.toThrow(AnafValidationError);

      // Invalid filter
      await expect(
        client.getMessages(mockAccessToken, { zile: 7, filtru: 'INVALID' as any })
      ).rejects.toThrow(AnafValidationError);
    });

    test('should validate paginated message parameters', async () => {
      // Invalid start time
      await expect(
        client.getMessagesPaginated(mockAccessToken, {
          startTime: 0,
          endTime: Date.now(),
          pagina: 1
        })
      ).rejects.toThrow(AnafValidationError);

      // End time before start time
      await expect(
        client.getMessagesPaginated(mockAccessToken, {
          startTime: Date.now(),
          endTime: Date.now() - 1000,
          pagina: 1
        })
      ).rejects.toThrow(AnafValidationError);

      // Invalid page number
      await expect(
        client.getMessagesPaginated(mockAccessToken, {
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          pagina: 0
        })
      ).rejects.toThrow(AnafValidationError);
    });
  });

  describe('Validation Operations', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

    beforeEach(() => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockResolvedValue({
        data: mockTestData.mockJsonResponses.validationSuccess
      });
    });

    test('should validate XML successfully', async () => {
      const result = await client.validateXml(mockAccessToken, xmlContent, 'FACT1');

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should validate XML with default standard', async () => {
      const result = await client.validateXml(mockAccessToken, xmlContent);

      expect(result).toBeDefined();
    });

    test('should validate document standard parameter', async () => {
      await expect(
        client.validateXml(mockAccessToken, xmlContent, 'INVALID' as DocumentStandardType)
      ).rejects.toThrow(AnafValidationError);
    });

    test('should validate signature with File objects', async () => {
      // Mock File objects for browser environment
      const mockXmlFile = new File(['xml content'], 'test.xml', { type: 'text/xml' });
      const mockSigFile = new File(['sig content'], 'test.sig', { type: 'application/octet-stream' });

      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockResolvedValue({
        data: { msg: 'Fișierele încărcate au fost validate cu succes' }
      });

      const result = await client.validateSignature(
        mockAccessToken,
        mockXmlFile,
        mockSigFile
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should validate signature with Buffer objects', async () => {
      const mockXmlBuffer = Buffer.from('xml content');
      const mockSigBuffer = Buffer.from('sig content');

      const mockHttpClient = (client as any).httpClient;
      
      // Mock FormData constructor to avoid Buffer/Blob compatibility issues
      const originalFormData = global.FormData;
      global.FormData = jest.fn().mockImplementation(() => ({
        append: jest.fn()
      }));

      mockHttpClient.post.mockResolvedValue({
        data: { msg: 'Fișierele încărcate au fost validate cu succes' }
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

      // Restore original FormData
      global.FormData = originalFormData;
    });

    test('should require file names for Buffer uploads', async () => {
      const mockBuffer = Buffer.from('content');

      await expect(
        client.validateSignature(mockAccessToken, mockBuffer, mockBuffer)
      ).rejects.toThrow(AnafValidationError);
    });
  });

  describe('PDF Conversion', () => {
    const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';
    const mockPdfBuffer = Buffer.from('Mock PDF content');

    beforeEach(() => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockResolvedValue({
        data: mockPdfBuffer
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
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow();
    });

    test('should handle 400 validation errors', async () => {
      const mockHttpClient = (client as any).httpClient;
      const error = createAxiosError(400, 'Bad Request', 'Invalid parameters');
      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow(AnafValidationError);
    });

    test('should handle 401 authentication errors', async () => {
      const mockHttpClient = (client as any).httpClient;
      const error = createAxiosError(401, 'Unauthorized');
      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow(AnafAuthenticationError);
    });

    test('should handle 500 server errors', async () => {
      const mockHttpClient = (client as any).httpClient;
      const error = createAxiosError(500, 'Internal Server Error', 'Server error');
      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow(AnafApiError);
    });

    test('should handle XML parsing errors in responses', async () => {
      const mockHttpClient = (client as any).httpClient;
      mockHttpClient.post.mockResolvedValue({
        data: 'This is not valid XML at all - no tags or structure'
      });

      await expect(
        client.uploadDocument(mockAccessToken, xmlContent)
      ).rejects.toThrow();
    });
  });

  describe('Parameter Validation', () => {
    test('should validate all enum parameters correctly', async () => {
      const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';

      // Test upload standard validation
      await expect(
        client.uploadDocument(mockAccessToken, xmlContent, { standard: 'INVALID' as any })
      ).rejects.toThrow(AnafValidationError);

      // Test document standard validation  
      await expect(
        client.validateXml(mockAccessToken, xmlContent, 'INVALID' as any)
      ).rejects.toThrow(AnafValidationError);

      // Test message filter validation
      await expect(
        client.getMessages(mockAccessToken, { zile: 7, filtru: 'INVALID' as any })
      ).rejects.toThrow(AnafValidationError);
    });

    test('should accept valid enum values', async () => {
      const xmlContent = '<?xml version="1.0"?><Invoice>test</Invoice>';
      const mockHttpClient = (client as any).httpClient;

      // Valid upload standards
      for (const standard of ['UBL', 'CN', 'CII', 'RASP']) {
        mockHttpClient.post.mockResolvedValue({
          data: mockTestData.mockXmlResponses.uploadSuccess
        });
        
        await expect(
          client.uploadDocument(mockAccessToken, xmlContent, { standard: standard as any })
        ).resolves.toBeDefined();
      }

      // Valid document standards
      for (const standard of ['FACT1', 'FCN']) {
        mockHttpClient.post.mockResolvedValue({
          data: mockTestData.mockJsonResponses.validationSuccess
        });
        
        await expect(
          client.validateXml(mockAccessToken, xmlContent, standard as any)
        ).resolves.toBeDefined();
      }

      // Valid message filters
      for (const filter of ['E', 'P', 'T', 'R']) {
        mockHttpClient.get.mockResolvedValue({
          data: mockTestData.mockJsonResponses.messagesSuccess
        });
        
        await expect(
          client.getMessages(mockAccessToken, { zile: 7, filtru: filter as any })
        ).resolves.toBeDefined();
      }
    });
  });
}); 