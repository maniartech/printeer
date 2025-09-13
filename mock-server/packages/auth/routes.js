import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const group = {
  id: 'auth',
  title: 'Authentication & Headers',
  routes: [
    { path: '/auth/basic', title: 'Basic auth' },
    { path: '/auth/bearer', title: 'Bearer token' },
    { path: '/auth/login', title: 'Login (POST)', method: 'POST' },
    { path: '/auth/protected', title: 'Cookie-protected' },
    { path: '/auth/csrf-login', title: 'CSRF login flow' },
    { path: '/debug/headers', title: 'Headers echo' },
    { path: '/debug/cookies', title: 'Cookies echo' }
  ]
};

export function createRouter() {
  const router = express.Router();

  // GET /auth/basic - Requires HTTP Basic Auth
  router.get('/auth/basic', (req, res) => {
    const auth = req.get('Authorization');
    
    if (!auth || !auth.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="Test Realm"');
      return res.status(401).render(path.join(__dirname, 'templates', 'auth-required'), {
        title: 'Basic Authentication Required',
        authType: 'Basic',
        instructions: 'Use --basic-auth user:pass or --auth user:pass'
      });
    }

    // Decode and validate credentials
    const credentials = Buffer.from(auth.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username === 'user' && password === 'pass') {
      res.render(path.join(__dirname, 'templates', 'auth-success'), {
        title: 'Basic Authentication Success',
        authType: 'Basic Auth',
        username,
        credentials: credentials
      });
    } else {
      res.set('WWW-Authenticate', 'Basic realm="Test Realm"');
      res.status(401).render(path.join(__dirname, 'templates', 'auth-failed'), {
        title: 'Basic Authentication Failed',
        authType: 'Basic',
        provided: credentials
      });
    }
  });

  // GET /auth/bearer - Requires Bearer token
  router.get('/auth/bearer', (req, res) => {
    const auth = req.get('Authorization');
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).render(path.join(__dirname, 'templates', 'auth-required'), {
        title: 'Bearer Token Required',
        authType: 'Bearer',
        instructions: 'Use --header "Authorization: Bearer your-token"'
      });
    }

    const token = auth.slice(7);
    
    if (token === 'test-token' || token === 'valid-token') {
      res.render(path.join(__dirname, 'templates', 'auth-success'), {
        title: 'Bearer Authentication Success',
        authType: 'Bearer Token',
        username: 'token-user',
        credentials: `Token: ${token}`
      });
    } else {
      res.status(401).render(path.join(__dirname, 'templates', 'auth-failed'), {
        title: 'Bearer Authentication Failed',
        authType: 'Bearer',
        provided: `Token: ${token}`
      });
    }
  });

  // GET /auth/login - Show login form
  router.get('/auth/login', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'login-form'), {
      title: 'Login Form',
      action: '/auth/login',
      method: 'POST'
    });
  });

  // POST /auth/login - Process login
  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'user' && password === 'pass') {
      // Set session cookie
      res.cookie('session', 'valid-session-token', {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.render(path.join(__dirname, 'templates', 'login-success'), {
        title: 'Login Successful',
        username,
        sessionToken: 'valid-session-token'
      });
    } else {
      res.status(401).render(path.join(__dirname, 'templates', 'login-failed'), {
        title: 'Login Failed',
        username,
        error: 'Invalid username or password'
      });
    }
  });

  // GET /auth/protected - Requires session cookie
  router.get('/auth/protected', (req, res) => {
    const session = req.cookies.session;
    
    if (!session || session !== 'valid-session-token') {
      return res.status(401).render(path.join(__dirname, 'templates', 'auth-required'), {
        title: 'Session Required',
        authType: 'Cookie',
        instructions: 'Login first at /auth/login or use --cookie "session=valid-session-token"'
      });
    }

    res.render(path.join(__dirname, 'templates', 'protected-content'), {
      title: 'Protected Content',
      sessionToken: session
    });
  });

  // GET /auth/csrf-login - CSRF-protected login form
  router.get('/auth/csrf-login', (req, res) => {
    const csrfToken = 'csrf-' + Math.random().toString(36).substr(2, 9);
    
    // Set CSRF token in cookie
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Allow JS access for form
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
    
    res.render(path.join(__dirname, 'templates', 'csrf-login-form'), {
      title: 'CSRF Protected Login',
      csrfToken,
      action: '/auth/csrf-login',
      method: 'POST'
    });
  });

  // POST /auth/csrf-login - Process CSRF-protected login
  router.post('/auth/csrf-login', (req, res) => {
    const { username, password, csrf_token } = req.body;
    const cookieCsrfToken = req.cookies['csrf-token'];
    
    // Validate CSRF token
    if (!csrf_token || csrf_token !== cookieCsrfToken) {
      return res.status(403).render(path.join(__dirname, 'templates', 'csrf-failed'), {
        title: 'CSRF Validation Failed',
        provided: csrf_token,
        expected: cookieCsrfToken
      });
    }
    
    if (username === 'user' && password === 'pass') {
      res.cookie('session', 'csrf-protected-session', {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.render(path.join(__dirname, 'templates', 'login-success'), {
        title: 'CSRF Protected Login Successful',
        username,
        sessionToken: 'csrf-protected-session'
      });
    } else {
      res.status(401).render(path.join(__dirname, 'templates', 'login-failed'), {
        title: 'CSRF Protected Login Failed',
        username,
        error: 'Invalid credentials'
      });
    }
  });

  // GET /debug/headers - Echo all headers
  router.get('/debug/headers', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'debug-headers'), {
      title: 'Request Headers Debug',
      headers: req.headers,
      method: req.method,
      url: req.url
    });
  });

  // GET /debug/cookies - Echo all cookies
  router.get('/debug/cookies', (req, res) => {
    res.render(path.join(__dirname, 'templates', 'debug-cookies'), {
      title: 'Cookies Debug',
      cookies: req.cookies,
      rawCookieHeader: req.get('Cookie') || 'No cookies sent'
    });
  });

  return router;
}