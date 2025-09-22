/**
 * Internationalization Test Suite
 */
export const i18nTestSuite = {
  name: 'Internationalization',
  group: 'i18n',
  description: 'Tests for international character sets, fonts, and text direction',
  testCases: [
    {
      name: 'utf8-characters',
      endpoint: '/i18n/utf8',
      description: 'UTF-8 character encoding and display',
      parameterMatrix: {
        format: ['A4', 'Letter'],
        quality: ['medium', 'high']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'UTF-8 characters display correctly',
        'Special characters and symbols render',
        'Encoding handled properly',
        'No character corruption'
      ]
    },
    {
      name: 'cjk-characters',
      endpoint: '/i18n/cjk',
      description: 'Chinese, Japanese, Korean character rendering',
      parameterMatrix: {
        format: ['A4'],
        waitFor: ['timeout:3000', 'networkidle2']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'CJK characters render correctly',
        'Font fallbacks work for CJK',
        'Character spacing appropriate',
        'Mixed CJK and Latin text works'
      ]
    },
    {
      name: 'arabic-rtl',
      endpoint: '/i18n/arabic',
      description: 'Arabic text and right-to-left rendering',
      parameterMatrix: {
        format: ['A4', 'Letter']
      },
      expectedBehavior: 'success',
      expectedOutputs: ['pdf'],
      manualChecks: [
        'Arabic text flows right-to-left',
        'Arabic script shaping correct',
        'BiDi text handling proper',
        'Mixed RTL/LTR content works'
      ]
    }
  ]
};