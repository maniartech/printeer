// Debug browser launching issue
const puppeteer = require('puppeteer');

async function testBrowser() {
  console.log('Starting browser test...');

  // Force bundled Chromium
  process.env.PRINTEER_BUNDLED_ONLY = '1';

  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      timeout: 30000,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('Browser launched successfully');

    console.log('Creating page...');
    const page = await browser.newPage();

    console.log('Navigating to test page...');
    await page.goto('data:text/html,<h1>Test</h1>');

    console.log('Getting title...');
    const title = await page.title();
    console.log('Title:', title);

    console.log('Closing page...');
    await page.close();

    console.log('Closing browser...');
    await browser.close();

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

testBrowser();
