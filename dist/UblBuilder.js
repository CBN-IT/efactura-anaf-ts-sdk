"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UblBuilder = void 0;
const errors_1 = require("./errors");
const InvoiceBuilder_1 = require("./ubl/InvoiceBuilder");
const tryCatch_1 = require("./tryCatch");
/**
 * UBL XML Builder for ANAF e-Factura
 *
 * Handles generation of UBL 2.1 XML invoices that comply with Romanian CIUS-RO
 * specification for ANAF e-Factura.
 *
 * @example
 * ```typescript
 * const builder = new UblBuilder();
 *
 * const xml = builder.generateInvoiceXml({
 *   invoiceNumber: 'INV-2024-001',
 *   issueDate: new Date(),
 *   supplier: {
 *     registrationName: 'Company SRL',
 *     companyId: 'RO12345678',
 *     vatNumber: 'RO12345678',
 *     address: {
 *       street: 'Str. Example 1',
 *       city: 'Bucharest',
 *       postalZone: '010101'
 *     }
 *   },
 *   customer: {
 *     registrationName: 'Customer SRL',
 *     companyId: 'RO87654321',
 *     address: {
 *       street: 'Str. Customer 2',
 *       city: 'Cluj-Napoca',
 *       postalZone: '400001'
 *     }
 *   },
 *   lines: [
 *     {
 *       description: 'Product/Service',
 *       quantity: 1,
 *       unitPrice: 100,
 *       taxPercent: 19
 *     }
 *   ],
 *   isSupplierVatPayer: true
 * });
 * ```
 */
class UblBuilder {
    /**
     * Generate UBL invoice XML
     *
     * Create a UBL 2.1 XML invoice that complies with Romanian CIUS-RO
     * specification for ANAF e-Factura.
     *
     * @param invoiceData Invoice data
     * @returns UBL XML string ready for upload
     * @throws {AnafValidationError} If invoice data is invalid
     */
    generateInvoiceXml(invoiceData) {
        const { data, error } = (0, tryCatch_1.tryCatch)(() => {
            return (0, InvoiceBuilder_1.buildInvoiceXml)(invoiceData);
        });
        if (error) {
            throw new errors_1.AnafValidationError(`Failed to generate invoice XML: ${error.message}`);
        }
        return data;
    }
}
exports.UblBuilder = UblBuilder;
