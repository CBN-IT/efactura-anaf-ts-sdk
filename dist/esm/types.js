/**
 * Execution status for upload operations
 * 0 indicates success, 1 indicates error
 */
export var ExecutionStatus;
(function (ExecutionStatus) {
    ExecutionStatus[ExecutionStatus["Success"] = 0] = "Success";
    ExecutionStatus[ExecutionStatus["Error"] = 1] = "Error";
})(ExecutionStatus || (ExecutionStatus = {}));
/**
 * Status values for upload processing (stare field)
 * As defined in OpenAPI spec for status check responses
 */
export var UploadStatusValue;
(function (UploadStatusValue) {
    /** Processing completed successfully */
    UploadStatusValue["Ok"] = "ok";
    /** Processing failed */
    UploadStatusValue["Failed"] = "nok";
    /** Currently being processed */
    UploadStatusValue["InProgress"] = "in prelucrare";
})(UploadStatusValue || (UploadStatusValue = {}));
/**
 * Message filters for listing operations
 * Each filter type represents a specific message category in the ANAF e-Factura system
 */
export var MessageFilter;
(function (MessageFilter) {
    /** FACTURA TRIMISA - Invoice sent by you to a buyer */
    MessageFilter["InvoiceSent"] = "T";
    /** FACTURA PRIMITA - Invoice received by you from a supplier */
    MessageFilter["InvoiceReceived"] = "P";
    /** ERORI FACTURA - Error messages returned after uploading invalid XML */
    MessageFilter["InvoiceErrors"] = "E";
    /** MESAJ CUMPARATOR - RASP message/comment from buyer to issuer (or vice versa) */
    MessageFilter["BuyerMessage"] = "R";
})(MessageFilter || (MessageFilter = {}));
//# sourceMappingURL=types.js.map