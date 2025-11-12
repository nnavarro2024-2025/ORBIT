/**
 * Test to verify pg type parser setup
 * Run this with: node test-pg-parser.js
 */

const { types } = require('pg');

console.log('Testing pg type parser setup...\n');

// Check default parser for JSONB (OID 3802)
console.log('1. Testing default JSONB parser (OID 3802):');
const defaultParser = types.getTypeParser(3802);
console.log('Default parser type:', typeof defaultParser);

try {
  const result = defaultParser('"undefined"');
  console.log('   Result for "undefined":', result, '(type:', typeof result, ')');
} catch (e) {
  console.log('   ERROR:', e.message);
}

// Set up custom parser (FIXED VERSION)
console.log('\n2. Setting up custom JSONB parser:');
const customParser = (val) => {
  if (val === null || val === undefined) return null;
  const trimmed = String(val).trim();
  
  // Handle both quoted and unquoted "undefined", "null", empty string
  // PostgreSQL JSONB stores strings WITH quotes, so "undefined" becomes '"undefined"'
  if (
    trimmed === "undefined" || 
    trimmed === '"undefined"' ||  // JSON-quoted string
    trimmed === "null" || 
    trimmed === '"null"' ||       // JSON-quoted string  
    trimmed === '""' ||           // Empty JSON string
    trimmed === ""
  ) {
    return null;
  }
  
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.log('   Custom parser caught error, returning null');
    return null;
  }
};

types.setTypeParser(3802, customParser);
console.log('Custom parser set!');

// Test custom parser
console.log('\n3. Testing custom JSONB parser:');
const newParser = types.getTypeParser(3802);
console.log('Parser type:', typeof newParser);

try {
  const result = newParser('"undefined"');
  console.log('   Result for "undefined":', result, '(type:', typeof result, 'is null:', result === null, ')');
} catch (e) {
  console.log('   ERROR:', e.message);
}

try {
  const result = newParser('{"test": 123}');
  console.log('   Result for valid JSON:', result, '(type:', typeof result, ')');
} catch (e) {
  console.log('   ERROR:', e.message);
}

// Test with just the string "undefined" (no quotes)
try {
  const result = newParser('undefined');
  console.log('   Result for unquoted undefined:', result, '(type:', typeof result, 'is null:', result === null, ')');
} catch (e) {
  console.log('   ERROR:', e.message);
}

console.log('\n4. Key insight:');
console.log('   - Custom parsers MUST be set before any Pool/Client connects');
console.log('   - Once a connection is made, parsers might be cached per connection');
console.log('   - In Turbopack bundling, modules load in unpredictable order');
