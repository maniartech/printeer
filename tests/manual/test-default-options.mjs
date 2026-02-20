// Test what getDefaultBrowserOptions returns
import { getDefaultBrowserOptions } from './dist/lib/index.js';

console.log('Default browser options:');
console.log(JSON.stringify(getDefaultBrowserOptions(), null, 2));
