/**
 * Media Emulation & Responsive Test Suite
 */
export const mediaTestSuite = {
  name: 'Media Emulation & Responsive',
  group: 'media',
  description: 'Tests for media queries, responsive design, and device emulation',
  testCases: [
    {
      name: 'print-vs-screen',
      endpoint: '/media/print-vs-screen',
      description: 'Print vs screen media query differences',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        background: [true, false]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Print media styles applied',
        'Screen-only content hidden',
        'Print-specific layout used',
        'Media query breakpoints work'
      ]
    },
    {
      name: 'responsive-grid',
      endpoint: '/viewport/responsive',
      description: 'Responsive grid layouts at different viewport sizes',
      parameterMatrix: {
        viewport: ['800x600', '1024x768', '1280x720', '1920x1080'],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Grid adapts to viewport size',
        'Breakpoints trigger correctly',
        'Content reflows appropriately',
        'Layout remains functional'
      ]
    },
    {
      name: 'color-scheme',
      endpoint: '/media/color-scheme',
      description: 'Color scheme media queries (light/dark mode)',
      parameterMatrix: {
        format: ['A4'],
        background: [true, false]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Color scheme detection works',
        'Dark/light mode styles apply',
        'Contrast ratios appropriate',
        'Theme switching functional'
      ]
    }
  ]
};