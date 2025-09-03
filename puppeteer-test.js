// Quick browser test
const { spawn } = require('child_process');

async function testPuppeteerBasic() {
  console.log('Testing basic Puppeteer functionality...');

  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.PRINTEER_BUNDLED_ONLY = '1';

  try {
    console.log('Importing Puppeteer...');
    const puppeteer = require('puppeteer');

    console.log('Launching browser with minimal config...');
    const browser = await puppeteer.launch({
      headless: true,
      timeout: 10000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    console.log('Browser launched successfully!');
    console.log('Browser connected:', browser.isConnected());

    console.log('Creating a test page...');
    const page = await browser.newPage();
    await page.goto('data:text/html,<h1>Test</h1>', { timeout: 5000 });

    console.log('Getting page title...');
    const title = await page.title();
    console.log('Page title:', title);

    console.log('Closing page and browser...');
    await page.close();
    await browser.close();

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPuppeteerBasic();
