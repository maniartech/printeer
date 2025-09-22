/**
 * Dynamic/SPA & Wait Strategies Test Suite
 */
export const dynamicTestSuite = {
  name: 'Dynamic/SPA & Wait Strategies',
  group: 'dynamic',
  description: 'Tests for dynamic content, SPA handling, and various wait strategies',
  testCases: [
    {
      name: 'delay-content',
      endpoint: '/spa/delay-content?ms=2000',
      description: 'Content that appears after a delay using JavaScript',
      parameterMatrix: {
        waitFor: ['timeout:3000', 'selector:#delayed-content', 'timeout:5000'],
        timeout: [5000, 10000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Delayed content is present in final output',
        'Wait strategy completed successfully',
        'No premature capture occurred',
        'Loading states are not visible',
        'Dynamic content is fully rendered'
      ]
    },
    {
      name: 'network-idle',
      endpoint: '/spa/network-idle?requests=5',
      description: 'Page with multiple network requests requiring network idle wait',
      parameterMatrix: {
        waitFor: ['networkidle0', 'networkidle2'],
        timeout: [10000, 15000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'All network requests completed before capture',
        'Dynamic content from API calls visible',
        'No loading indicators or spinners',
        'Images and resources fully loaded',
        'JavaScript execution completed'
      ]
    },
    {
      name: 'title-change',
      endpoint: '/spa/title-late?ms=1000',
      description: 'Page title that changes after initial load',
      parameterMatrix: {
        waitFor: ['timeout:2000', 'function:window.__titleReady'],
        timeout: [5000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Final title reflects dynamic changes',
        'Title change was captured',
        'Page metadata is up to date',
        'No stale title information'
      ]
    },
    {
      name: 'interactive-content',
      endpoint: '/spa/interactive',
      description: 'Interactive elements and their final state',
      parameterMatrix: {
        waitFor: ['selector:.interactive-ready', 'timeout:3000'],
        viewport: ['1024x768', '1280x720']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Interactive elements in final state',
        'No hover or transition states captured',
        'Form elements show default values',
        'Interactive components fully loaded',
        'Viewport size affects layout appropriately'
      ]
    },
    {
      name: 'custom-ready-function',
      endpoint: '/spa/custom-ready?ms=2000',
      description: 'Custom JavaScript function indicating readiness',
      parameterMatrix: {
        waitFor: ['function:window.__ready', 'function:window.__customReady'],
        timeout: [5000, 8000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Custom ready function was executed',
        'Page waited for custom signal',
        'All custom initialization completed',
        'Dynamic content from custom logic visible'
      ]
    },
    {
      name: 'slow-javascript',
      endpoint: '/spa/delay-content?ms=4000',
      description: 'Slow JavaScript execution and heavy computations',
      parameterMatrix: {
        waitFor: ['timeout:6000', 'selector:#computation-complete'],
        timeout: [10000, 15000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Heavy computations completed',
        'CPU-intensive operations finished',
        'Final computed values visible',
        'No intermediate computation states',
        'All JavaScript execution completed'
      ]
    },
    {
      name: 'dom-mutations',
      endpoint: '/spa/interactive',
      description: 'DOM mutations and dynamic element creation',
      parameterMatrix: {
        waitFor: ['selector:.mutation-complete', 'timeout:4000'],
        viewport: ['800x600', '1024x768']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Dynamically created elements present',
        'DOM mutations completed',
        'Element attributes updated correctly',
        'CSS classes applied to dynamic elements',
        'Layout reflows handled properly'
      ]
    },
    {
      name: 'async-data-loading',
      endpoint: '/spa/network-idle?requests=3',
      description: 'Asynchronous data loading and rendering',
      parameterMatrix: {
        waitFor: ['networkidle2', 'selector:.data-loaded'],
        timeout: [8000, 12000]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Asynchronous data fully loaded',
        'Data rendered in correct format',
        'No loading placeholders visible',
        'Error states handled gracefully',
        'All API responses processed'
      ]
    }
  ]
};