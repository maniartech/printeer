// Simple PDF test without custom options
import printeer from './dist/lib/index.js';

process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
process.env.PRINTEER_BUNDLED_ONLY = '0';

console.log('Testing PDF generation with default options...');

// Test 1: with undefined
console.log('\nTest 1: undefined options');
try {
  const result = await printeer('http://example.com', 'test-simple-undefined.pdf', 'pdf', undefined);
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Test 2: with null
console.log('\nTest 2: null options');
try {
  const result = await printeer('http://example.com', 'test-simple-null.pdf', 'pdf', null);
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Test 3: with empty object
console.log('\nTest 3: empty object options');
try {
  const result = await printeer('http://example.com', 'test-simple-empty.pdf', 'pdf', {});
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}
