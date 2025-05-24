# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added

#### Core Features
- **Complete ANAF e-Factura SDK** - Comprehensive TypeScript SDK for Romanian ANAF e-Factura system
- **OAuth 2.0 Authentication** - Full OAuth flow with authorization, token exchange, and refresh
- **UBL 2.1 Invoice Generation** - CIUS-RO compliant XML invoice generation
- **Document Upload & Download** - Support for UBL, CN, CII, RASP standards
- **Status Tracking** - Monitor upload and processing status
- **Message Listing** - Retrieve messages with pagination support

#### API Endpoints
- `getAuthorizationUrl()` - Generate OAuth authorization URL
- `exchangeCodeForToken()` - Exchange authorization code for tokens
- `refreshAccessToken()` - Refresh expired access tokens
- `uploadDocument()` - Upload invoice documents to ANAF
- `uploadB2CDocument()` - Upload B2C (Business to Consumer) invoices
- `getUploadStatus()` - Check processing status of uploaded documents
- `downloadDocument()` - Download processed documents and responses
- `getMessages()` - Get recent messages from ANAF
- `getMessagesPaginated()` - Get messages with pagination support

#### Validation & Conversion
- `validateXml()` - Validate XML documents against ANAF schemas
- `convertXmlToPdf()` - Convert e-Factura XML to PDF format
- `validateSignature()` - Validate digital signatures on XML documents

#### UBL Generation
- `generateInvoiceXml()` - Generate UBL 2.1 XML invoices
- **Multiple VAT Rates** - Support for different tax percentages on invoice lines
- **Tax Category Logic** - Automatic tax category determination (S, Z, O)
- **Address Validation** - Comprehensive address and party information validation
- **CIUS-RO Compliance** - Full compliance with Romanian UBL specification

#### Error Handling
- `AnafSdkError` - Base error class for SDK-specific errors
- `AnafApiError` - API-related errors with status codes
- `AnafAuthenticationError` - Authentication and authorization errors
- `AnafValidationError` - Data validation and input errors
- `AnafXmlParsingError` - XML parsing and structure errors
- `AnafUnexpectedResponseError` - Unexpected API response errors

#### Utilities
- **Date Utilities** - ANAF-compatible date formatting and validation
- **XML Parsing** - Robust XML response parsing with error handling
- **Form Encoding** - OAuth and form data encoding utilities
- **Query Builders** - URL parameter builders for all endpoints

#### Configuration
- **Dual Authentication** - Support for both OAuth and certificate authentication
- **Environment Support** - Test and production environment configuration
- **Custom Axios Config** - Extensible HTTP client configuration
- **TypeScript First** - Full type safety and IntelliSense support

#### Developer Experience
- **Comprehensive Documentation** - Detailed API documentation with examples
- **Type Definitions** - Complete TypeScript type definitions
- **Error Context** - Detailed error messages with context
- **Debug Logging** - Optional request/response logging for development

### Technical Details

#### Dependencies
- `axios` ^1.7.0 - HTTP client for API requests
- `date-fns` ^3.6.0 - Date manipulation and formatting
- `qs` ^6.11.2 - Query string parsing and encoding
- `xmlbuilder2` ^4.1.0 - XML document generation

#### Build System
- **Multiple Formats** - CommonJS, ESM, and TypeScript declarations
- **Modern Tooling** - ESLint, Prettier, Jest for code quality
- **Comprehensive Testing** - Unit tests with coverage reporting
- **Documentation Generation** - TypeDoc for API documentation

#### Standards Compliance
- **UBL 2.1** - Universal Business Language version 2.1
- **CIUS-RO** - Romanian Core Invoice Usage Specification
- **OAuth 2.0** - Standard OAuth 2.0 authorization flow
- **TypeScript 5.x** - Modern TypeScript with strict type checking

### Breaking Changes
- This is the initial release, no breaking changes from previous versions

### Migration Guide
- This is a new implementation combining the best features from multiple ANAF SDK approaches
- Provides backward compatibility interfaces where possible
- See README.md for complete usage examples and migration guidance

### Known Issues
- None at this time

### Security
- All sensitive data (tokens, credentials) are handled securely
- No credentials are logged or exposed in error messages
- HTTPS-only communication with ANAF APIs
- Proper OAuth 2.0 state parameter support for CSRF protection 