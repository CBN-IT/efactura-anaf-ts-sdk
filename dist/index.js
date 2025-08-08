"use strict";
/**
 * ANAF e-Factura TypeScript SDK
 *
 * A comprehensive TypeScript SDK for interacting with the Romanian ANAF e-Factura system.
 * Provides OAuth 2.0 authentication, document upload/download, validation, UBL generation,
 * and company data lookup from the public ANAF API.
 *
 * @example
 * ```typescript
 * import { AnafAuthenticator, AnafEfacturaClient, AnafDetailsClient } from 'efactura-ts-sdk';
 *
 * // Setup authentication
 * const auth = new AnafAuthenticator({
 *   clientId: 'your-oauth-client-id',
 *   clientSecret: 'your-oauth-client-secret',
 *   redirectUri: 'https://your-app.com/callback'
 * });
 *
 * // Setup API client
 * const client = new AnafEfacturaClient({
 *   vatNumber: 'RO12345678',
 *   testMode: true
 * });
 *
 * // Setup company details client
 * const detailsClient = new AnafDetailsClient();
 *
 * // Authenticate and get tokens
 * const authUrl = auth.getAuthorizationUrl();
 * const tokens = await auth.exchangeCodeForToken(authCode);
 *
 * // Use tokens for API operations
 * const uploadResult = await client.uploadDocument(tokens.access_token, xmlContent);
 *
 * // Fetch company data
 * const companyData = await detailsClient.getCompanyData('RO12345678');
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.Constants = exports.FormUtils = exports.DateUtils = exports.Utils = exports.UblBuilder = exports.AnafDetailsClient = exports.AnafAuthenticator = exports.AnafEfacturaClient = void 0;
// Main exports
var AnafClient_1 = require("./AnafClient");
Object.defineProperty(exports, "AnafEfacturaClient", { enumerable: true, get: function () { return AnafClient_1.AnafEfacturaClient; } });
var AnafAuthenticator_1 = require("./AnafAuthenticator");
Object.defineProperty(exports, "AnafAuthenticator", { enumerable: true, get: function () { return AnafAuthenticator_1.AnafAuthenticator; } });
var AnafDetailsClient_1 = require("./AnafDetailsClient");
Object.defineProperty(exports, "AnafDetailsClient", { enumerable: true, get: function () { return AnafDetailsClient_1.AnafDetailsClient; } });
var UblBuilder_1 = require("./UblBuilder");
Object.defineProperty(exports, "UblBuilder", { enumerable: true, get: function () { return UblBuilder_1.UblBuilder; } });
// Types
__exportStar(require("./types"), exports);
// Errors
__exportStar(require("./errors"), exports);
// UBL Builder
__exportStar(require("./ubl"), exports);
// Utilities (for advanced users)
exports.Utils = __importStar(require("./utils/xmlParser"));
exports.DateUtils = __importStar(require("./utils/dateUtils"));
exports.FormUtils = __importStar(require("./utils/formEncoder"));
// Constants (for advanced users)
exports.Constants = __importStar(require("./constants"));
// Default export for convenience
var AnafClient_2 = require("./AnafClient");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return AnafClient_2.AnafEfacturaClient; } });
