import { create } from 'xmlbuilder2';
import { UploadStatus } from '../types';
import { AnafXmlParsingError } from '../errors';
import { tryCatch } from '../tryCatch';

/**
 * Parses XML responses from ANAF API
 *
 * ANAF returns XML responses for upload, status check, and some other operations.
 * This utility provides a consistent way to parse these responses and extract
 * the relevant information.
 */

/**
 * Parse XML response from ANAF upload or status operations
 * @param xmlString Raw XML response from ANAF
 * @returns Parsed status object
 * @throws {AnafXmlParsingError} If XML cannot be parsed or has unexpected structure
 */
export function parseXmlResponse(xmlString: string): UploadStatus {
  // Parse XML to object
  const { data: doc, error } = tryCatch(() => {
    return create(xmlString).toObject({ group: true }) as any;
  });

  if (error) {
    throw new AnafXmlParsingError('Failed to parse XML response', xmlString);
  }

  // Try to find the main response element - ANAF uses 'header' element
  const header = doc.header || doc.Header;

  if (header) {
    const content = Array.isArray(header) ? header[0] : header;

    // xmlbuilder2 stores attributes in '@' property when using { group: true }
    const attributes = content['@'] || content;

    // Handle upload response (contains index_incarcare)
    if (attributes.index_incarcare) {
      return {
        index_incarcare: String(attributes.index_incarcare),
      };
    }

    // Handle status response (contains id_descarcare and/or stare)
    if (attributes.id_descarcare || attributes.stare) {
      return {
        id_descarcare: attributes.id_descarcare ? String(attributes.id_descarcare) : undefined,
        stare: attributes.stare ? String(attributes.stare) : undefined,
      };
    }

    // Handle error responses with ExecutionStatus
    if (attributes.ExecutionStatus && attributes.ExecutionStatus !== '0') {
      // Look for error message in child elements
      const errorMessage =
        content.Errors?.['@']?.errorMessage ||
        content.Error?.['@']?.errorMessage ||
        content.Errors?.errorMessage ||
        content.Error?.errorMessage ||
        'Upload failed';
      return { eroare: errorMessage };
    }

    // If ExecutionStatus is 0, it's successful - look for other attributes
    if (attributes.ExecutionStatus === '0') {
      return {
        index_incarcare: attributes.index_incarcare
          ? String(attributes.index_incarcare)
          : undefined,
        id_descarcare: attributes.id_descarcare ? String(attributes.id_descarcare) : undefined,
        stare: attributes.stare ? String(attributes.stare) : undefined,
      };
    }
  }

  // Fallback: Try to find other common response structures
  const raspuns = doc.Raspuns || doc.Envelope?.Body?.Raspuns || doc.response || doc.Response;

  if (raspuns) {
    const content = Array.isArray(raspuns) ? raspuns[0] : raspuns;

    // Handle upload response (contains index_incarcare)
    if (content.index_incarcare) {
      return {
        index_incarcare: extractTextValue(content.index_incarcare),
      };
    }

    // Handle status response (contains id_descarcare and/or stare)
    if (content.id_descarcare || content.stare) {
      return {
        id_descarcare: content.id_descarcare ? extractTextValue(content.id_descarcare) : undefined,
        stare: content.stare ? extractTextValue(content.stare) : undefined,
      };
    }

    // Handle error responses
    if (content.Error || content.eroare) {
      const errorDetail = content.Error || content.eroare;
      const errorMessage = errorDetail.mesaj
        ? extractTextValue(errorDetail.mesaj)
        : extractTextValue(errorDetail);
      return { eroare: errorMessage };
    }

    // Try to extract from first available key (fallback)
    const firstKey = Object.keys(content)[0];
    if (firstKey && content[firstKey]) {
      const innerObject = Array.isArray(content[firstKey])
        ? content[firstKey][0]
        : content[firstKey];

      if (typeof innerObject === 'object' && innerObject !== null) {
        return {
          index_incarcare: innerObject.index_incarcare
            ? extractTextValue(innerObject.index_incarcare)
            : undefined,
          id_descarcare: innerObject.id_descarcare
            ? extractTextValue(innerObject.id_descarcare)
            : undefined,
          stare: innerObject.stare ? extractTextValue(innerObject.stare) : undefined,
          eroare: innerObject.eroare ? extractTextValue(innerObject.eroare) : undefined,
          mesaj: innerObject.mesaj ? extractTextValue(innerObject.mesaj) : undefined,
        };
      }
    }
  }

  // If we can't parse the structure, throw an error
  throw new AnafXmlParsingError('Unknown or unexpected XML response structure', xmlString);
}

/**
 * Extract text value from XML element
 * Handles both string values and array structures that xmlbuilder2 might create
 */
function extractTextValue(element: any): string {
  if (typeof element === 'string') {
    return element;
  }
  if (Array.isArray(element) && element.length > 0) {
    return String(element[0]);
  }
  if (typeof element === 'object' && element !== null && element._) {
    return String(element._);
  }
  return String(element);
}

/**
 * Parse JSON response from ANAF API
 * Some endpoints return JSON instead of XML
 * @param response Response data that might be JSON
 * @returns Parsed object or throws error
 */
export function parseJsonResponse<T = any>(response: any): T {
  if (typeof response === 'string') {
    const { data, error } = tryCatch(() => {
      return JSON.parse(response);
    });

    if (error) {
      throw new AnafXmlParsingError('Failed to parse JSON response', response);
    }

    return data;
  }

  return response;
}

/**
 * Determine if a response is an error based on common ANAF patterns
 * @param response Parsed response object
 * @returns True if response indicates an error
 */
export function isErrorResponse(response: any): boolean {
  return !!(
    response?.eroare ||
    response?.Error ||
    response?.error ||
    (response?.stare && response.stare.toLowerCase() === 'nok')
  );
}

/**
 * Extract error message from response
 * @param response Parsed response object
 * @returns Error message or null if no error found
 */
export function extractErrorMessage(response: any): string | null {
  if (response?.eroare) return response.eroare;
  if (response?.Error?.mesaj) return response.Error.mesaj;
  if (response?.error) return response.error;
  if (response?.mesaj && response?.stare === 'nok') return response.mesaj;
  return null;
}
