/**
 * Cache, Compression & CSP Test Suite
 */
export const cacheCSPTestSuite = {
  name: 'Cache, Compression & CSP',
  group: 'cache-csp',
  description: 'Tests for caching, compression, and Content Security Policy',
  testCases: [
    {
      name: 'cacheable-content',
      endpoint: '/cache/cacheable',
      description: 'Cacheable resources and cache headers',
      parameterMatrix: {
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Cacheable content loads correctly',
        'Cache headers respected',
        'Resource caching works',
        'Performance benefits realized'
      ]
    },
    {
      name: 'no-cache-content',
      endpoint: '/cache/no-store',
      description: 'Non-cacheable content handling',
      parameterMatrix: {
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'No-cache headers respected',
        'Content fetched fresh',
        'Cache-control directives followed'
      ]
    },
    {
      name: 'strict-csp',
      endpoint: '/csp/strict',
      description: 'Strict Content Security Policy handling',
      parameterMatrix: {
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'CSP headers processed correctly',
        'Blocked content handled gracefully',
        'Security policies enforced'
      ]
    }
  ]
};