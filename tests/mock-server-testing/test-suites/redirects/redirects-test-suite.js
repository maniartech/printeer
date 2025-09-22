/**
 * Redirects & Navigation Test Suite
 */
export const redirectsTestSuite = {
  name: 'Redirects & Navigation',
  group: 'redirects',
  description: 'Tests for HTTP redirects and navigation handling',
  testCases: [
    {
      name: 'redirect-chain',
      endpoint: '/redirect/chain?n=3&to=/static/simple',
      description: 'Chain of HTTP redirects',
      parameterMatrix: {
        format: ['A4'],
        timeout: [5000, 10000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Redirect chain followed correctly',
        'Final destination reached',
        'Redirect limits respected',
        'Content from final URL captured'
      ]
    },
    {
      name: 'delayed-redirect',
      endpoint: '/redirect/delay?ms=1000&to=/static/simple',
      description: 'Delayed redirect handling',
      parameterMatrix: {
        timeout: [3000, 5000],
        waitFor: ['timeout:2000']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Delayed redirects handled properly',
        'Wait time appropriate',
        'Final content captured correctly'
      ]
    }
  ]
};