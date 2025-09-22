/**
 * Image Capture & Clipping Test Suite
 */
export const imageTestSuite = {
  name: 'Image Capture & Clipping',
  group: 'image',
  description: 'Tests for image output, clipping, and quality settings',
  testCases: [
    {
      name: 'clip-target',
      endpoint: '/image/clip-target',
      description: 'Element clipping and selective capture',
      parameterMatrix: {
        viewport: ['800x600', '1024x768'],
        quality: ['medium', 'high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['png'],
      manualChecks: [
        'Target element clipped correctly',
        'Clipping boundaries precise',
        'Background handling appropriate',
        'Image quality meets specification'
      ]
    },
    {
      name: 'transparent-background',
      endpoint: '/image/transparent-bg',
      description: 'Transparent background image capture',
      parameterMatrix: {
        background: [false],
        quality: ['high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['png'],
      manualChecks: [
        'Background transparency preserved',
        'Alpha channel handled correctly',
        'Transparent areas truly transparent',
        'Content over transparency clear'
      ]
    },
    {
      name: 'quality-comparison',
      endpoint: '/image/quality-grid',
      description: 'Image quality comparison grid',
      parameterMatrix: {
        quality: ['low', 'medium', 'high'],
        viewport: ['1024x768']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['jpg', 'png'],
      manualChecks: [
        'Quality differences visible',
        'Compression artifacts appropriate',
        'File sizes correlate with quality',
        'Quality grid renders correctly'
      ]
    }
  ]
};