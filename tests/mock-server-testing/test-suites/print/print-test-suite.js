/**
 * Print CSS & Page Formatting Test Suite
 */
export const printTestSuite = {
  name: 'Print CSS & Page Formatting',
  group: 'print',
  description: 'Tests for print-specific CSS, page formatting, margins, and page breaks',
  testCases: [
    {
      name: 'css-default',
      endpoint: '/print/css-default',
      description: 'Default print CSS overrides and @media print rules',
      parameterMatrix: {
        format: ['A4', 'Letter', 'A3'],
        orientation: ['portrait', 'landscape'],
        background: [true, false]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        '@media print styles are applied',
        'Screen-only elements are hidden',
        'Print-specific styling is visible',
        'Background graphics handling matches setting',
        'Color vs grayscale rendering is appropriate'
      ]
    },
    {
      name: 'margins-validation',
      endpoint: '/print/margins?top=1in&right=1in&bottom=1in&left=1in',
      description: 'Page margins and content positioning',
      parameterMatrix: {
        margins: ['none', '1in', '2cm', '1in,2cm,1in,2cm', '0.5in'],
        format: ['A4', 'Letter', 'A3']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Margin rulers show correct measurements',
        'Content respects margin boundaries',
        'Asymmetric margins are properly applied',
        'Content does not overflow into margins',
        'Print vs screen margin differences handled'
      ]
    },
    {
      name: 'custom-page-size',
      endpoint: '/print/custom-size?width=210mm&height=99mm',
      description: 'Custom page dimensions and scaling',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        scale: [0.5, 1.0, 1.5, 2.0],
        orientation: ['portrait', 'landscape']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Custom page size is properly applied',
        'Content scales appropriately',
        'Aspect ratio is maintained',
        'Text remains readable at all scales',
        'Layout integrity is preserved'
      ]
    },
    {
      name: 'page-breaks',
      endpoint: '/print/page-breaks',
      description: 'CSS page break controls and behavior',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        scale: [1.0, 1.25]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Page breaks occur at intended locations',
        'page-break-before/after rules work',
        'page-break-inside: avoid is respected',
        'No orphaned lines or content',
        'Headings stay with following content'
      ]
    },
    {
      name: 'header-footer',
      endpoint: '/print/header-footer-demo',
      description: 'Page headers and footers rendering',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        margins: ['1in', '2cm']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Headers appear on every page',
        'Footers are positioned correctly',
        'Page numbers increment properly',
        'Header/footer content is not clipped',
        'Dynamic content in headers works'
      ]
    },
    {
      name: 'no-print-elements',
      endpoint: '/print/no-print-elements',
      description: 'Elements with display: none for print',
      parameterMatrix: {
        format: ['A4'],
        background: [true, false]
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Elements marked as no-print are hidden',
        'Print-only elements are visible',
        'Layout adjusts for hidden elements',
        'No empty spaces from hidden content'
      ]
    },
    {
      name: 'orientation-handling',
      endpoint: '/print/orientation?landscape=true',
      description: 'Page orientation switching and content adaptation',
      parameterMatrix: {
        orientation: ['portrait', 'landscape'],
        format: ['A4', 'Letter', 'A3']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Page orientation matches specification',
        'Content adapts to orientation change',
        'Margins are correctly rotated',
        'Text flows appropriately',
        'Layout is optimized for orientation'
      ]
    },
    {
      name: 'scale-markers',
      endpoint: '/print/scale-markers',
      description: 'Scale factor visualization and measurement',
      parameterMatrix: {
        scale: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
        format: ['A4']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Scale rulers show correct measurements',
        'Content scales uniformly',
        'Text remains readable at all scales',
        'Images scale proportionally',
        'Layout proportions are maintained'
      ]
    },
    {
      name: 'css-page-size',
      endpoint: '/print/css-page-size',
      description: 'CSS @page size rules and browser compatibility',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        orientation: ['portrait', 'landscape']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'CSS @page size rules are respected',
        'Browser and CLI size settings interact correctly',
        'Page dimensions match expectations',
        'Orientation changes work with @page'
      ]
    },
    {
      name: 'tagged-structure',
      endpoint: '/pdf/tagged-structure',
      description: 'PDF accessibility and tagged structure',
      parameterMatrix: {
        format: ['A4'],
        quality: ['medium', 'high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'PDF structure is logically tagged',
        'Headings have proper hierarchy',
        'Text content is selectable',
        'Accessibility metadata is present',
        'Reading order is logical'
      ]
    }
  ]
};