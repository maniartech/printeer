import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'i18n',
  title: 'Internationalization',
  routes: [
    { path: '/i18n/utf8', title: 'UTF-8 sample' },
    { path: '/i18n/cjk', title: 'CJK sample' },
    { path: '/i18n/arabic', title: 'Arabic RTL' },
    { path: '/debug/intl', title: 'Intl/locale debug' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /i18n/utf8 - Rich UTF-8 sample with accents and emoji
  router.get('/i18n/utf8', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'utf8-sample'), {
      title: 'UTF-8 Character Testing - Tëst Pàgé 🌍'
    });
  });

  // GET /i18n/cjk - Chinese, Japanese, Korean text samples
  router.get('/i18n/cjk', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'cjk-sample'), {
      title: 'CJK Language Sample - 中文日本語한국어'
    });
  });

  // GET /i18n/arabic - Arabic RTL text sample
  router.get('/i18n/arabic', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'arabic-sample'), {
      title: 'Arabic RTL Sample - عينة النص العربي'
    });
  });

  // GET /debug/intl - Internationalization debug info
  router.get('/debug/intl', (req, res) => {
    const acceptLanguage = req.get('Accept-Language') || 'en-US';
    const timezone = req.query.tz || 'UTC';
    const locale = req.query.locale || 'en-US';
    
    // Create sample date and number for formatting
    const now = new Date();
    const sampleNumber = 1234567.89;
    
    // Format using different locales
    const locales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP', 'ar-SA', 'zh-CN'];
    const formattedDates = {};
    const formattedNumbers = {};
    const formattedCurrency = {};
    
    locales.forEach(loc => {
      try {
        formattedDates[loc] = now.toLocaleDateString(loc);
        formattedNumbers[loc] = sampleNumber.toLocaleString(loc);
        formattedCurrency[loc] = sampleNumber.toLocaleString(loc, { 
          style: 'currency', 
          currency: loc === 'ja-JP' ? 'JPY' : loc === 'de-DE' ? 'EUR' : 'USD' 
        });
      } catch (e) {
        formattedDates[loc] = 'Error';
        formattedNumbers[loc] = 'Error';
        formattedCurrency[loc] = 'Error';
      }
    });
    
    res.render(path.join(__dirname, 'templates', 'intl-debug'), {
      title: 'Internationalization Debug Information',
      acceptLanguage,
      timezone,
      locale,
      currentDate: now.toISOString(),
      sampleNumber,
      formattedDates,
      formattedNumbers,
      formattedCurrency,
      locales
    });
  });

  return router;
}