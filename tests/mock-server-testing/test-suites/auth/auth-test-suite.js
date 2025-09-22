/**
 * Authentication & Headers Test Suite
 */
export const authTestSuite = {
  name: 'Authentication & Headers',
  group: 'auth',
  description: 'Tests for various authentication methods and custom headers',
  testCases: [
    {
      name: 'basic-auth-success',
      endpoint: '/auth/basic',
      description: 'HTTP Basic Authentication with valid credentials',
      parameterMatrix: {
        headers: [
          { 'Authorization': 'Basic dXNlcjpwYXNz' }, // user:pass base64
          { 'Authorization': 'Basic YWRtaW46YWRtaW4=' } // admin:admin base64
        ],
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Authenticated content is visible',
        'No login prompts in output',
        'Protected content rendered correctly',
        'Authentication headers processed properly',
        'User-specific content displayed'
      ]
    },
    {
      name: 'basic-auth-failure',
      endpoint: '/auth/basic',
      description: 'HTTP Basic Authentication with invalid credentials',
      parameterMatrix: {
        headers: [
          null,
          { 'Authorization': 'Basic aW52YWxpZDppbnZhbGlk' }, // invalid:invalid base64
        ],
        retries: [0, 1]
      },
      expectedBehavior: 'error',
      expectedOutputs: [],
      manualChecks: [
        'Authentication failure handled gracefully',
        'Proper error messages displayed',
        'No sensitive information leaked',
        'Retry logic works as expected'
      ]
    },
    {
      name: 'bearer-token',
      endpoint: '/auth/bearer',
      description: 'Bearer token authentication',
      parameterMatrix: {
        headers: [
          { 'Authorization': 'Bearer test-token-123' },
          { 'Authorization': 'Bearer valid-jwt-token' }
        ],
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Bearer token accepted successfully',
        'Token-protected content accessible',
        'Authorization header processed correctly',
        'Token validation working properly'
      ]
    },
    {
      name: 'custom-headers',
      endpoint: '/debug/headers',
      description: 'Custom headers transmission and processing',
      parameterMatrix: {
        headers: [
          { 'X-API-Key': 'secret-key-123' },
          { 'X-Client-Version': '1.0', 'X-Request-ID': 'req-456' },
          { 'Custom-Header': 'test-value', 'Another-Header': 'another-value' }
        ],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Custom headers properly transmitted',
        'Header values displayed correctly',
        'Multiple headers handled simultaneously',
        'Header case sensitivity respected'
      ]
    },
    {
      name: 'cookie-auth',
      endpoint: '/auth/protected',
      description: 'Cookie-based authentication and session handling',
      parameterMatrix: {
        cookies: [
          { 'session_id': 'valid-session-123' },
          { 'auth_token': 'cookie-token-456', 'user_id': '789' }
        ],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Cookie authentication successful',
        'Session cookies transmitted properly',
        'Protected content accessible via cookies',
        'Multiple cookies handled correctly'
      ]
    },
    {
      name: 'csrf-protection',
      endpoint: '/auth/csrf-login',
      description: 'CSRF token handling and form submission',
      parameterMatrix: {
        waitFor: ['selector:input[name="csrf_token"]', 'timeout:3000'],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'CSRF tokens generated and handled',
        'Form submission security working',
        'Token validation successful',
        'Protected forms accessible'
      ]
    },
    {
      name: 'headers-echo-debug',
      endpoint: '/debug/headers',
      description: 'Request headers echoing for debugging',
      parameterMatrix: {
        headers: [
          { 'User-Agent': 'Custom-Printeer-Agent/1.0' },
          { 'Accept': 'text/html,application/pdf', 'Accept-Language': 'en-US,en;q=0.9' }
        ],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'All request headers echoed correctly',
        'Header names and values accurate',
        'Standard HTTP headers included',
        'Custom headers properly displayed'
      ]
    },
    {
      name: 'cookies-echo-debug',
      endpoint: '/debug/cookies',
      description: 'Cookie values echoing and debugging',
      parameterMatrix: {
        cookies: [
          { 'debug_mode': 'true', 'test_cookie': 'test_value' },
          { 'preference': 'dark_mode', 'lang': 'en' }
        ],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Cookie values echoed accurately',
        'Multiple cookies displayed',
        'Cookie names preserved correctly',
        'Special characters in cookies handled'
      ]
    }
  ]
};