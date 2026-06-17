#!/usr/bin/env node

/**
 * Test script to verify Google API connectivity
 * Run with: node scripts/test-google-apis.js
 */

require('dotenv').config({ path: '.env.local' });

async function testGoogleSheets() {
  console.log('📊 Testing Google Sheets API...');

  try {
    // Dynamic import to avoid server-only issues
    const { googleSheets, appendRowToSheet } = await import('../src/lib/google.js');

    if (!googleSheets) {
      console.log('  ❌ Google Sheets client not initialized');
      return false;
    }

    console.log('  ✅ Google Sheets client initialized');

    // Test by checking if we can read sheet info
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.log('  ❌ GOOGLE_SHEET_ID not set');
      return false;
    }

    console.log('  ✅ GOOGLE_SHEET_ID present:', spreadsheetId.substring(0,打好) + '...');

    // Try to get sheet info (without headers, just metadata)
    try {
      const response = await googleSheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
      });

      console.log('  ✅ Connected to Google Sheet:', response.data.properties?.title || 'Unknown');
      console.log('  ✅ Sheet URL: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
      return true;
    } catch (error) {
      console.log('  ❌ Failed to access Google Sheet:', error.message);
      console.log('  💡 Ensure sheet is shared with:', process.env.GOOGLE_CLIENT_EMAIL);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error testing Google Sheets:', error.message);
    return false;
  }
}

async function testGoogleCalendar() {
  console.log('📅 Testing Google Calendar API...');

  try {
    const { googleCalendar, createCalendarEvent } = await import('../src/lib/google.js');

    if (!googleCalendar) {
      console.log('  ❌ Google Calendar client not initialized');
      return false;
    }

    console.log('  ✅ Google Calendar client initialized');

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    console.log('  ✅ Calendar ID:', calendarId);

    // Try to list calendars (just a simple test)
    try {
      const response = await googleCalendar.calendarList.list();
      console.log('  ✅ Calendar API accessible');

      const targetCalendar = response.data.items?.find(cal =>
        cal.id === calendarId || cal.id.includes(calendarId)
      );

      if (targetCalendar) {
        console.log('  ✅ Target calendar found:', targetCalendar.summary);
        return true;
      } else {
        console.log('  ⚠️  Calendar ID not found in list');
        console.log('  💡 Available calendars:', response.data.items?.map(cal => cal.summary).join(', ') || 'none');
        console.log('  💡 Ensure calendar is shared with:', process.env.GOOGLE_CLIENT_EMAIL);
        return false;
      }
    } catch (error) {
      console.log('  ❌ Failed to access Google Calendar:', error.message);
      console.log('  💡 Ensure calendar is shared with:', process.env.GOOGLE_CLIENT_EMAIL);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error testing Google Calendar:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Google API Configuration\n');

  // Check required environment variables
  const requiredVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  console.log('✅ All required environment variables present');

  // Check private key format
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    console.log('❌ GOOGLE_PRIVATE_KEY format appears incorrect');
    console.log('   Should include: -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
    process.exit(1);
  }

  console.log('✅ GOOGLE_PRIVATE_KEY format appears correct');

  // Run API tests
  const sheetsOk = await testGoogleSheets();
  const calendarOk = await testGoogleCalendar();

  console.log('\n📊 Test Results:');
  console.log(`  Google Sheets: ${sheetsOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Google Calendar: ${calendarOk ? '✅ PASS' : '❌ FAIL'}`);

  if (!sheetsOk || !calendarOk) {
    console.log('\n🚨 Configuration issues detected');
    console.log('\n💡 Troubleshooting Steps:');
    console.log('  1. Share Google Sheet with:', process.env.GOOGLE_CLIENT_EMAIL);
    console.log('  2. Share Google Calendar with same email');
    console.log('  3. Ensure Google Sheets & Calendar APIs are enabled in Cloud Console');
    console.log('  4. Wait 5-10 minutes after sharing for permissions to propagate');
    process.exit(1);
  }

  console.log('\n🎉 All Google API tests passed!');
  console.log('\n📝 Next Steps:');
  console.log('  1. Add headers to Google Sheet: Date/Time, Customer Name, Phone Number, Service Booked, Amount Paid, Payment Method');
  console.log('  2. Test booking flow with: npm run dev');
  console.log('  3. Deploy with: git push && vercel deploy');
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});