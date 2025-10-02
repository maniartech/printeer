// Test Puppeteer launch directly
import puppeteer from 'puppeteer';

console.log('Testing Puppeteer launch...');

const timeout = setTimeout(() => {
  console.error('❌ Launch timed out after 15 seconds');
  process.exit(1);
}, 15000);

try {
  console.log('Attempting to launch browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless=new'
    ]
  });

  console.log('✅ Browser launched successfully');
  console.log('Browser version:', await browser.version());

  await browser.close();
  console.log('✅ Browser closed');

  clearTimeout(timeout);
  process.exit(0);
} catch (error) {
  clearTimeout(timeout);
  console.error('❌ Error launching browser:', error.message);
  process.exit(1);
}
