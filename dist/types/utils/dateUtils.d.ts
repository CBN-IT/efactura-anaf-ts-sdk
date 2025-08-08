/**
 * Date utility functions for ANAF e-Factura SDK
 *
 * Provides consistent date formatting and validation
 * that matches ANAF API requirements.
 */
/**
 * Format date for ANAF API (YYYY-MM-DD format)
 * @param date Date to format (string, Date, or number)
 * @returns Formatted date string
 */
export declare function formatDateForAnaf(date: string | Date | number): string;
/**
 * Get current date in ANAF format
 * @returns Current date as YYYY-MM-DD string
 */
export declare function getCurrentDateForAnaf(): string;
/**
 * Validate date string format for ANAF API
 * @param dateString Date string to validate
 * @returns True if format is valid
 */
export declare function isValidAnafDateFormat(dateString: string): boolean;
/**
 * Convert date to Unix timestamp in milliseconds
 * Used for pagination endpoints
 * @param date Date to convert
 * @returns Unix timestamp in milliseconds
 */
export declare function dateToTimestamp(date: string | Date | number): number;
/**
 * Get date range for pagination (start of day to end of day)
 * @param date Target date
 * @returns Object with start and end timestamps
 */
export declare function getDayRange(date: string | Date): {
    start: number;
    end: number;
};
/**
 * Calculate days between two dates
 * @param from Start date
 * @param to End date
 * @returns Number of days
 */
export declare function daysBetween(from: string | Date, to: string | Date): number;
/**
 * Get date N days ago from today
 * @param days Number of days to subtract
 * @returns Date N days ago
 */
export declare function getDaysAgo(days: number): Date;
/**
 * Validate that days parameter is within ANAF limits (1-60)
 * @param days Days value to validate
 * @returns True if valid
 */
export declare function isValidDaysParameter(days: number): boolean;
