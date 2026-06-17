/**
 * Google API client for server-side Sheets and Calendar integration.
 *
 * Setup:
 * 1. Create a Service Account in Google Cloud Console
 * 2. Enable Google Sheets API and Google Calendar API
 * 3. Create and download a JSON key file
 * 4. Add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to .env.local
 * 5. Add GOOGLE_SHEET_ID (from Sheet URL) to .env.local
 * 6. Share your Google Sheet with the service account email (as Editor)
 * 7. Ensure Sheet has columns: Date/Time, Customer Name, Phone Number, Service Booked, Amount Paid, Payment Method
 *
 * @warning This module is server-only and cannot be imported in client components.
 */

import 'server-only';
import { google } from 'googleapis';

type SheetsClient = any; // sheets_v4.Sheets
type CalendarClient = any; // calendar_v3.Calendar
type JWTClient = any; // auth.JWT

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  console.error(
    'Missing Google OAuth2 environment variables: GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are required'
  );
  // In production, you might want to throw an error or handle this differently
  // For now, we just log an error and export undefined clients
}

// Prepare private key - replace escaped newlines
const privateKey = GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Create JWT auth client
let authClient: JWTClient | null = null;
let sheetsClient: SheetsClient | null = null;
let calendarClient: CalendarClient | null = null;

try {
  if (GOOGLE_CLIENT_EMAIL && privateKey) {
    authClient = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/calendar',
      ],
    });

    // Initialize API clients
    sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    calendarClient = google.calendar({ version: 'v3', auth: authClient });
  }
} catch (error) {
  console.error('Failed to initialize Google API clients:', error);
  // Clients will remain null if initialization fails
}

/**
 * Google Sheets API client
 * @warning Only use in server-side environments (API routes, Server Actions)
 *
 * @example
 * ```ts
 * import { googleSheets } from '@/lib/google';
 *
 * const response = await googleSheets.spreadsheets.values.get({
 *   spreadsheetId: 'your-spreadsheet-id',
 *   range: 'Sheet1!A1:D10',
 * });
 * ```
 */
export const googleSheets: SheetsClient | null = sheetsClient;

/**
 * Google Calendar API client
 * @warning Only use in server-side environments (API routes, Server Actions)
 *
 * @example
 * ```ts
 * import { googleCalendar } from '@/lib/google';
 *
 * const events = await googleCalendar.events.list({
 *   calendarId: 'primary',
 *   timeMin: new Date().toISOString(),
 *   maxResults: 10,
 * });
 * ```
 */
export const googleCalendar: CalendarClient | null = calendarClient;

/**
 * Get a fresh authenticated JWT client (useful for separate scopes)
 * @warning Only use in server-side environments
 */
export function getGoogleAuth(scopes?: string[]): JWTClient {
  if (!GOOGLE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Google OAuth2 credentials not configured');
  }
  return new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: scopes || [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
    ],
  });
}

/**
 * Interface for booking data to append to Google Sheet
 */
export interface BookingData {
  /** Transaction creation date/time */
  dateTime: string;
  /** Customer full name */
  customerName: string;
  /** Customer phone number */
  phoneNumber: string;
  /** Service(s) booked */
  serviceBooked: string;
  /** Amount paid in INR */
  amountPaid: number;
  /** Payment method (cash, upi, razorpay) */
  paymentMethod: string;
  /** Optional POS operator comment/note */
  comment?: string;
}

/**
 * Append a booking record to Google Sheet
 * @param bookingData Booking data to log
 * @param sheetRange Range to append to (default: 'Sheet1!A:G')
 * @param sheetId Optional sheet ID (default: process.env.GOOGLE_SHEET_ID)
 * @returns Promise with the append response
 */
export async function appendRowToSheet(
  bookingData: BookingData,
  sheetRange: string = 'Sheet1!A:G',
  sheetId?: string
): Promise<any> {
  const spreadsheetId = sheetId || process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID environment variable not set');
  }

  if (!googleSheets) {
    throw new Error('Google Sheets client not initialized');
  }

  // Prepare row data in the correct column order
  const rowData = [
    bookingData.dateTime,
    bookingData.customerName,
    bookingData.phoneNumber,
    bookingData.serviceBooked,
    bookingData.amountPaid,
    bookingData.paymentMethod,
    bookingData.comment || '',
  ];

  try {
    const response = await googleSheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetRange,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log('Booking logged to Google Sheet:', response.data.updates?.updatedRange);
    return response.data;
  } catch (error) {
    console.error('Failed to append row to Google Sheet:', error);
    throw error;
  }
}

/**
 * Helper to extract service names from transaction items_json
 * Similar to function in transactions page
 */
export function getServiceNamesFromItems(itemsJson: any[]): string {
  if (!itemsJson || !Array.isArray(itemsJson)) return "—";
  const serviceItems = itemsJson.filter((item) => item.type === "service");
  if (serviceItems.length === 0) return "—";
  // Get unique service names (could be multiple services in one transaction)
  const names = Array.from(new Set(serviceItems.map((item) => item.name)));
  return names.join(", ");
}

/**
 * Interface for slot data to create calendar event
 */
export interface SlotData {
  /** Service name */
  serviceName: string;
  /** Slot start time (ISO string) */
  startTime: string;
  /** Slot end time (ISO string) */
  endTime: string;
  /** Slot ID (optional) */
  slotId?: string;
}

/**
 * Interface for customer data for calendar event
 */
export interface CustomerData {
  /** Customer full name */
  customerName: string;
  /** Customer phone number */
  phoneNumber: string;
  /** Amount paid in INR */
  amountPaid: number;
  /** Transaction ID (optional) */
  transactionId?: string;
}

/**
 * Create a Google Calendar event for a booked slot
 * @param slotData Slot timing and service information
 * @param customerData Customer information
 * @param calendarId Optional calendar ID (default: process.env.GOOGLE_CALENDAR_ID or 'primary')
 * @returns Promise with the created event
 */
export async function createCalendarEvent(
  slotData: SlotData,
  customerData: CustomerData,
  calendarId?: string
): Promise<any> {
  const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!googleCalendar) {
    throw new Error('Google Calendar client not initialized');
  }

  const eventSummary = `${slotData.serviceName} - ${customerData.customerName}`;
  const eventDescription = `Phone: ${customerData.phoneNumber}\nAmount Paid: ₹${customerData.amountPaid}\n${customerData.transactionId ? `Transaction ID: ${customerData.transactionId}` : ''}`;

  const event = {
    summary: eventSummary,
    description: eventDescription.trim(),
    start: {
      dateTime: slotData.startTime,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: slotData.endTime,
      timeZone: 'Asia/Kolkata',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  try {
    const response = await googleCalendar.events.insert({
      calendarId: calId,
      requestBody: event,
    });

    console.log('Calendar event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}