// Test the printeer API directly
import printeer from './dist/lib/index.js';
import path from 'path';

console.log('Testing printeer API...');

// Force oneshot strategy and disable bundled only mode
process.env.PRINTEER_BROWSER_STRATEGY = 'oneshot';
process.env.PRINTEER_BUNDLED_ONLY = '0';

const url = 'http://example.com';  // Use HTTP instead of HTTPS
const out = path.resolve(process.cwd(), 'test-api-output.pdf');

console.log('URL:', url);
console.log('Output:', out);

// Set timeout
const timeout = setTimeout(() => {
  console.error('❌ Test timed out after 30 seconds');
  process.exit(1);
}, 30000);

printeer(url, out, 'pdf', {
  headless: 'new',
  pipe: false,
  timeout: 25000,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--remote-debugging-port=0'
  ]
})
  .then((result) => {
    clearTimeout(timeout);
    console.log('✅ PDF generated:', result);
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
