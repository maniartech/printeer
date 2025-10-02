/**
 * Templates & Variables Test Suite
 */
export const templatesTestSuite = {
  name: 'Templates & Variables',
  group: 'templates',
  description: 'Tests for header/footer templates and variable substitution',
  testCases: [
    {
      name: 'header-template',
      endpoint: '/template/header',
      description: 'Header template with variables',
      parameterMatrix: {
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Header template rendered correctly',
        'Variables substituted properly',
        'Header appears on all pages',
        'Template formatting preserved'
      ]
    },
    {
      name: 'footer-template',
      endpoint: '/template/footer',
      description: 'Footer template with page numbers',
      parameterMatrix: {
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Footer template rendered correctly',
        'Page numbers increment properly',
        'Footer positioning correct',
        'Template variables work'
      ]
    }
  ]
};