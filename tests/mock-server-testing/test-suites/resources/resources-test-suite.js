/**
 * Resources & Performance Test Suite
 */
export const resourcesTestSuite = {
  name: 'Resources & Performance',
  group: 'resources',
  description: 'Tests for resource loading, performance, and optimization',
  testCases: [
    {
      name: 'slow-resources',
      endpoint: '/assets/slow.js?ms=1500',
      description: 'Slow loading JavaScript resources',
      parameterMatrix: {
        timeout: [3000, 5000],
        waitFor: ['networkidle2']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Slow resources eventually load',
        'Timeout handling appropriate',
        'Page waits for slow resources',
        'Performance impact measured'
      ]
    },
    {
      name: 'large-images',
      endpoint: '/assets/large-image.svg?kb=1024',
      description: 'Large image resource handling',
      parameterMatrix: {
        timeout: [8000, 15000],
        quality: ['medium', 'high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Large images load completely',
        'Memory usage reasonable',
        'Image quality preserved',
        'Loading time acceptable'
      ]
    },
    {
      name: 'missing-resources',
      endpoint: '/assets/missing',
      description: '404 missing resource handling',
      parameterMatrix: {
        retries: [1, 2],
        timeout: [5000]
      },
      expectedBehavior: 'mixed',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Missing resources handled gracefully',
        '404 errors do not break page',
        'Fallback content displayed',
        'Page renders despite missing assets'
      ]
    }
  ]
};