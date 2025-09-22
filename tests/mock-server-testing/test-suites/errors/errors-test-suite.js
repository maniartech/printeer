/**
 * Errors & Resilience Test Suite
 */
export const errorsTestSuite = {
  name: 'Errors & Resilience',
  group: 'errors',
  description: 'Tests for error handling, resilience, and failure scenarios',
  testCases: [
    {
      name: 'http-500-handling',
      endpoint: '/error/500',
      description: 'HTTP 500 Internal Server Error handling',
      parameterMatrix: {
        retries: [0, 1, 3],
        timeout: [5000, 10000]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'HTTP 500 error properly detected',
        'Error message clearly communicated',
        'Retry attempts made as configured',
        'No partial output files created',
        'Graceful failure without crashes'
      ]
    },
    {
      name: 'timeout-handling',
      endpoint: '/error/timeout?ms=10000',
      description: 'Request timeout and timeout handling',
      parameterMatrix: {
        timeout: [3000, 5000],
        retries: [1, 2]
      },
      expectedBehavior: 'timeout',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'Timeout occurs within expected timeframe',
        'Timeout error properly reported',
        'Resources cleaned up after timeout',
        'Retry logic handles timeouts correctly',
        'No zombie processes left behind'
      ]
    },
    {
      name: 'connection-reset',
      endpoint: '/error/reset',
      description: 'Connection reset and network interruption handling',
      parameterMatrix: {
        retries: [1, 3, 5],
        timeout: [5000]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'Connection reset detected properly',
        'Network errors handled gracefully',
        'Appropriate error messages shown',
        'Retry logic for network failures works',
        'Connection cleanup performed'
      ]
    },
    {
      name: 'flaky-endpoint',
      endpoint: '/error/flaky?fail=2',
      description: 'Flaky endpoint that succeeds after failures',
      parameterMatrix: {
        retries: [0, 2, 4],
        timeout: [5000, 8000]
      },
      expectedBehavior: 'mixed', // Depends on retry count
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Flaky endpoint eventually succeeds with retries',
        'Intermediate failures handled properly',
        'Success achieved within retry limit',
        'Error messages for failed attempts logged',
        'Final success produces valid output'
      ]
    },
    {
      name: 'malformed-response',
      endpoint: '/error/malformed',
      description: 'Malformed HTTP response handling',
      parameterMatrix: {
        retries: [1, 2],
        timeout: [5000]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'Malformed responses detected',
        'Protocol errors handled gracefully',
        'Invalid headers processed safely',
        'Parser errors communicated clearly'
      ]
    },
    {
      name: 'redirect-loop',
      endpoint: '/redirect/loop',
      description: 'Infinite redirect loop detection',
      parameterMatrix: {
        timeout: [3000, 5000],
        retries: [0, 1]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'Redirect loops detected and prevented',
        'Maximum redirect limit enforced',
        'Loop detection works quickly',
        'Clear error message about redirect loop'
      ]
    },
    {
      name: 'large-page-timeout',
      endpoint: '/error/heavy-page?size=large',
      description: 'Large page processing timeout',
      parameterMatrix: {
        timeout: [5000, 15000],
        retries: [1],
        scale: [0.5, 1.0]
      },
      expectedBehavior: 'mixed', // May succeed with longer timeout
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Large pages handled appropriately',
        'Memory usage remains reasonable',
        'Timeout appropriate for page complexity',
        'Scaling affects processing time correctly'
      ]
    },
    {
      name: 'invalid-ssl-certificate',
      endpoint: '/error/invalid-ssl',
      description: 'Invalid SSL certificate handling',
      parameterMatrix: {
        retries: [0, 1],
        timeout: [5000]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'SSL certificate errors detected',
        'Security validation enforced',
        'Certificate warnings communicated',
        'Insecure connections rejected appropriately'
      ]
    },
    {
      name: 'resource-exhaustion',
      endpoint: '/error/memory-heavy',
      description: 'Resource exhaustion and memory limits',
      parameterMatrix: {
        timeout: [10000, 20000],
        retries: [0, 1]
      },
      expectedBehavior: 'error',
      expectedExitCode: 1,
      expectedOutputs: [],
      manualChecks: [
        'Memory limits respected',
        'Resource exhaustion handled gracefully',
        'System stability maintained',
        'Clear error messages about resource limits'
      ]
    }
  ]
};