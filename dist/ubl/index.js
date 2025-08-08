"use strict";
/**
 * UBL (Universal Business Language) Module
 *
 * This module provides functionality for generating UBL 2.1 XML invoices
 * compliant with Romanian CIUS-RO specification for ANAF e-Factura.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUblInvoiceXml = exports.buildInvoiceXml = void 0;
var InvoiceBuilder_1 = require("./InvoiceBuilder");
Object.defineProperty(exports, "buildInvoiceXml", { enumerable: true, get: function () { return InvoiceBuilder_1.buildInvoiceXml; } });
Object.defineProperty(exports, "buildUblInvoiceXml", { enumerable: true, get: function () { return InvoiceBuilder_1.buildUblInvoiceXml; } });
