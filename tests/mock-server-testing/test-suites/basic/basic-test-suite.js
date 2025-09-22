/**
 * Basic Pages and Layout Test Suite
 */
export const basicTestSuite = {
  name: 'Basic Pages and Layout',
  group: 'basic',
  description: 'Tests for basic HTML pages, layout, fonts, and core rendering',
  testCases: [
    {
      name: 'simple-html',
      endpoint: '/static/simple',
      description: 'Basic HTML page with standard content',
      parameterMatrix: {
        format: ['A4', 'Letter', 'A3'],
        orientation: ['portrait', 'landscape'],
        margins: ['1in', '2cm', 'none']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Text is properly rendered and readable',
        'Margins are correctly applied',
        'Page orientation matches specification',
        'HTML structure is preserved',
        'No content overflow or clipping'
      ]
    },
    {
      name: 'long-content',
      endpoint: '/static/long?pages=5',
      description: 'Multi-page document with extensive content',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        orientation: ['portrait', 'landscape'],
        scale: [1.0, 1.5]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Page breaks are clean and logical',
        'Content flows correctly across pages',
        'No orphaned headings or content',
        'Page numbers are sequential',
        'Scale factor is properly applied'
      ]
    },
    {
      name: 'rtl-content',
      endpoint: '/static/rtl',
      description: 'Right-to-left language content rendering',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        orientation: ['portrait']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'RTL text flows from right to left',
        'Text alignment is correct',
        'Mixed LTR/RTL content handled properly',
        'Layout direction is preserved'
      ]
    },
    {
      name: 'web-fonts',
      endpoint: '/static/fonts',
      description: 'Web fonts loading and rendering',
      parameterMatrix: {
        format: ['A4'],
        orientation: ['portrait'],
        waitFor: ['timeout:5000', 'networkidle2']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Custom fonts are loaded and rendered',
        'Font fallbacks work if fonts fail to load',
        'Text remains readable throughout',
        'Font weights and styles are preserved'
      ]
    },
    {
      name: 'image-grid',
      endpoint: '/static/images',
      description: 'Image loading and layout in grid format',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        orientation: ['portrait', 'landscape'],
        quality: ['medium', 'high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'All images load correctly',
        'Image quality is appropriate',
        'Grid layout is preserved',
        'Images scale appropriately',
        'No broken image placeholders'
      ]
    },
    {
      name: 'user-agent-debug',
      endpoint: '/debug/ua',
      description: 'User agent string debugging and detection',
      parameterMatrix: {
        format: ['A4'],
        userAgent: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'custom-printeer-agent'
        ]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'User agent string is correctly displayed',
        'Custom user agents work properly',
        'Browser detection logic functions',
        'Debug information is readable'
      ]
    },
    {
      name: 'request-echo',
      endpoint: '/debug/echo',
      description: 'Request headers and parameters echo',
      parameterMatrix: {
        format: ['A4'],
        headers: [
          null,
          { 'Custom-Header': 'test-value' },
          { 'X-Test-Id': '12345', 'X-Version': '1.0' }
        ]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Request headers are properly echoed',
        'Custom headers appear in output',
        'Header values are accurate',
        'No sensitive headers leaked'
      ]
    }
  ]
};