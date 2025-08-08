import { InvoiceInput, UblInvoiceInput } from '../types';
/**
 * Build comprehensive UBL 2.1 Invoice XML
 *
 * This function creates a complete UBL 2.1 XML invoice that complies with
 * the Romanian CIUS-RO specification for ANAF e-Factura.
 *
 * @param input Invoice data
 * @returns UBL XML string
 * @throws {AnafValidationError} If input data is invalid
 *
 * @example
 * ```typescript
 * const xml = buildInvoiceXml({
 *   invoiceNumber: 'INV-2024-001',
 *   issueDate: new Date(),
 *   supplier: {
 *     registrationName: 'Furnizor SRL',
 *     companyId: 'RO12345678',
 *     vatNumber: 'RO12345678',
 *     address: {
 *       street: 'Str. Exemplu 1',
 *       city: 'București',
 *       postalZone: '010101'
 *     }
 *   },
 *   customer: {
 *     registrationName: 'Client SRL',
 *     companyId: 'RO87654321',
 *     address: {
 *       street: 'Str. Client 2',
 *       city: 'Cluj-Napoca',
 *       postalZone: '400001'
 *     }
 *   },
 *   lines: [
 *     {
 *       description: 'Produs/Serviciu',
 *       quantity: 1,
 *       unitPrice: 100,
 *       taxPercent: 19
 *     }
 *   ],
 *   isSupplierVatPayer: true
 * });
 * ```
 */
export declare function buildInvoiceXml(input: InvoiceInput): string;
/**
 * Legacy compatibility function
 * @param input UBL invoice input (legacy format)
 * @returns UBL XML string
 * @deprecated Use buildInvoiceXml instead
 */
export declare function buildUblInvoiceXml(input: UblInvoiceInput): string;
