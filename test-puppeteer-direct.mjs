// Test Puppeteer launch directly with exact args from our code
import puppeteer from 'puppeteer';

console.log('Testing Puppeteer launch with our exact args...');

const timeout = setTimeout(() => {
  console.error('❌ Launch timed out after 15 seconds');
  process.exit(1);
}, 15000);

try {
  console.log('Attempting to launch browser...');
  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless=new'
      // REMOVED: '--no-startup-window' causes timeout!
    ]
  };

  console.log('Options:', JSON.stringify(options, null, 2));

  const browser = await puppeteer.launch(options);

  console.log('✅ Browser launched successfully');
  console.log('Browser version:', await browser.version());
  console.log('Browser connected:', browser.isConnected());

  // Try to create a page and navigate
  console.log('Creating page...');
  const page = await browser.newPage();
  console.log('✅ Page created');

  console.log('Navigating to example.com...');
  await page.goto('http://example.com', { waitUntil: 'networkidle0', timeout: 15000 });
  console.log('✅ Navigation successful');

  await page.close();
  await browser.close();
  console.log('✅ Test complete - everything works!');

  clearTimeout(timeout);
  process.exit(0);
} catch (error) {
  clearTimeout(timeout);
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}