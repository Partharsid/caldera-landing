#!/usr/bin/env node

/**
 * Quick verification script for RR Downtown deployment
 * Run with: node scripts/verify-deployment.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment configuration...\n');

// Check environment variables
const envFile = path.join(__dirname, '..', '.env.local');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_SECRET',
  'ADMIN_PASSWORD',
  'ADMIN_COOKIE_SECRET',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEET_ID',
  'GOOGLE_CALENDAR_ID',
];

// Read env file
let envContent = '';
try {
  envContent = fs.readFileSync(envFile, 'utf8');
} catch (error) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envLines = envContent.split('\n');
const envVars = {};

for (const line of envLines) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
}

console.log('📋 Environment Variables Check:');
let allEnvVarsPresent = true;

requiredEnvVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`  ✅ ${varName} = ${varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PASSWORD') ? '*******' : envVars[varName].substring(0, 30) + (envVars[varName].length > 30 ? '...' : '')}`);
  } else {
    console.log(`  ❌ ${varName} = MISSING`);
    allEnvVarsPresent = false;
  }
});

console.log('\n🔧 Configuration Issues:');

// Check specific issues
const issues = [];

// Check RAZORPAY_WEBHOOK_SECRET - should not be a URL
if (envVars.RAZORPAY_WEBHOOK_SECRET && envVars.RAZORPAY_WEBHOOK_SECRET.includes('http')) {
  issues.push('❌ RAZORPAY_WEBHOOK_SECRET appears to be a URL, should be a secret key from Razorpay Dashboard');
}

// Check Google Private Key format
if (envVars.GOOGLE_PRIVATE_KEY && !envVars.GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
  issues.push('❌ GOOGLE_PRIVATE_KEY format may be incorrect - should include BEGIN/END PRIVATE KEY lines');
}

// Check GOOGLE_CALENDAR_ID - might be an email address, which Google API can handle
if (envVars.GOOGLE_CALENDAR_ID && envVars.GOOGLE_CALENDAR_ID.includes('@')) {
  console.log('  ⚠️  GOOGLE_CALENDAR_ID is an email address - ensure calendar is shared with service account');
}

// Check NEXT_PUBLIC_BASE_URL (optional but recommended)
if (!envVars.NEXT_PUBLIC_BASE_URL) {
  issues.push('⚠️  NEXT_PUBLIC_BASE_URL not set (recommended for production)');
}

if (issues.length === 0) {
  console.log('  ✅ No critical configuration issues found');
} else {
  issues.forEach(issue => console.log(`  ${issue}`));
}

console.log('\n📁 File Structure Check:');
const requiredFiles = [
  'src/lib/google.ts',
  'src/hooks/useRevenueTrend.ts',
  'src/app/admin/analytics/page.tsx',
  'src/app/admin/transactions/page.tsx',
  'src/app/api/razorpay/webhook/route.ts',
];

let allFilesPresent = true;
requiredFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${filePath}`);
  } else {
    console.log(`  ❌ ${filePath} - NOT FOUND`);
    allFilesPresent = false;
  }
});

console.log('\n📊 Summary:');
console.log(`  Environment Variables: ${allEnvVarsPresent ? '✅ All present' : '❌ Missing some'}`);
console.log(`  Required Files: ${allFilesPresent ? '✅ All present' : '❌ Missing some'}`);
console.log(`  Configuration Issues: ${issues.length} issue(s)`);

if (!allEnvVarsPresent || !allFilesPresent || issues.length > 0) {
  console.log('\n🚨 FIX REQUIRED BEFORE DEPLOYMENT');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! You can proceed with deployment.');
  console.log('\n📝 Next Steps:');
  console.log('  1. Add headers to Google Sheet: "Date/Time", "Customer Name", "Phone Number", "Service Booked", "Amount Paid", "Payment Method"');
  console.log('  2. Share Google Sheet with: ' + (envVars.GOOGLE_CLIENT_EMAIL || 'service-account-email'));
  console.log('  3. Share Google Calendar with same service account email');
  console.log('  4. Update Razorpay webhook URL (in Razorpay Dashboard):');
  console.log('     ✅ Webhook URL: https://' + (envVars.NEXT_PUBLIC_BASE_URL?.replace('https://', '').replace('http://', '') || 'YOUR-DOMAIN.com') + '/api/razorpay/webhook');
  console.log('     ✅ Webhook Secret (in .env): ' + (envVars.RAZORPAY_WEBHOOK_SECRET?.substring(0, 10) + '***'));
  console.log('  5. Test with: npm run build && npm start');
}