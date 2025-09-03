// Quick browser test
import { DefaultBrowserFactory } from './src/core/browser.js';

async function testMinimal() {
  console.log('Setting up test environment...');
  process.env.NODE_ENV = 'test';
  process.env.PRINTEER_BUNDLED_ONLY = '1';

  console.log('Creating browser factory...');
  const factory = new DefaultBrowserFactory();

  console.log('Getting launch options...');
  const options = factory.getOptimalLaunchOptions();
  console.log('Launch options:', JSON.stringify(options, null, 2));

  console.log('Attempting to create browser...');
  try {
    const browser = await factory.createBrowser();
    console.log('Browser created successfully!');
    console.log('Browser connected:', browser.isConnected());
    await browser.close();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error creating browser:', error);
  }
}

testMinimal();
