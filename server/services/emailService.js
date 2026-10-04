const nodemailer = require('nodemailer');
const {
  verifyEmailTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
  accountDeletedTemplate,
} = require('./emailTemplates');

let transporter = null;
let etherealAccount = null;
let etherealFailed = false;
let currentTransportMode = null; // 'real_smtp' | 'ethereal' | 'console'
let isInitializing = null;

/**
 * Safely sanitize environment variable strings:
 * - Trims whitespace
 * - Strips accidental surrounding single or double quotes
 */
const cleanEnv = (val) => {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (
    (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
    (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
};

/**
 * Check if real SMTP credentials are provided in environment
 */
const hasRealSmtpConfig = () => {
  const host = cleanEnv(process.env.SMTP_HOST);
  const service = cleanEnv(process.env.SMTP_SERVICE);
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASSWORD);
  return Boolean((host || service) && user && pass);
};

/**
 * Mask sensitive email for safe diagnostic logging
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'configured';
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];
  const maskedUser = user.length > 2 ? `${user.substring(0, 2)}***` : `${user}***`;
  return `${maskedUser}@${domain}`;
};

/**
 * Resolve production client URL with intelligent fallbacks
 */
const resolveClientUrl = (req) => {
  const clientUrl = cleanEnv(process.env.CLIENT_URL);
  const frontendUrl = cleanEnv(process.env.FRONTEND_URL);
  const appUrl = cleanEnv(process.env.APP_URL);

  const configured = clientUrl || frontendUrl || appUrl;
  if (configured && !configured.includes('localhost')) {
    return configured.replace(/\/$/, '');
  }

  // Deployed on Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // Detect dynamically from incoming request headers
  if (req) {
    const origin = req.headers?.origin || req.headers?.referer;
    if (origin && origin.startsWith('http') && !origin.includes('localhost')) {
      try {
        const parsed = new URL(origin);
        return parsed.origin.replace(/\/$/, '');
      } catch (_) {}
    }
  }

  return (configured || 'http://localhost:5173').replace(/\/$/, '');
};

/**
 * Safe Configuration Diagnostics
 */
const logSmtpDiagnostics = () => {
  const host = cleanEnv(process.env.SMTP_HOST);
  const rawPort = cleanEnv(process.env.SMTP_PORT);
  const rawSecure = cleanEnv(process.env.SMTP_SECURE);
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASSWORD);
  const fromEmail = cleanEnv(process.env.FROM_EMAIL);
  const fromName = cleanEnv(process.env.FROM_NAME);

  const port = Number(rawPort) || 587;
  const isCustom = hasRealSmtpConfig();

  console.log('==================================================');
  console.log('[SMTP Configuration Diagnostics]');
  console.log(`SMTP_HOST configured:     ${host ? `YES (${host})` : 'NO'}`);
  console.log(`SMTP_PORT configured:     ${rawPort ? `YES (${port})` : 'NO (defaulted to 587)'}`);
  console.log(`SMTP_SECURE configured:   ${rawSecure ? `YES (${rawSecure})` : 'NO (auto-detected)'}`);
  console.log(`SMTP_USER configured:     ${user ? `YES (${maskEmail(user)})` : 'NO'}`);
  console.log(`SMTP_PASSWORD configured: ${pass ? `YES (length: ${pass.length}, mask: [CONFIGURED])` : 'NO'}`);
  console.log(`FROM_EMAIL configured:    ${fromEmail ? `YES (${fromEmail})` : user ? `NO (auto-fallback to SMTP_USER: ${maskEmail(user)})` : 'NO'}`);
  console.log(`FROM_NAME configured:     ${fromName ? `YES (${fromName})` : 'NO (default: ChatFlow)'}`);
  console.log(`CLIENT_URL configured:    ${process.env.CLIENT_URL ? `YES (${process.env.CLIENT_URL})` : process.env.VERCEL_URL ? `YES (Vercel: https://${process.env.VERCEL_URL})` : 'NO (default: http://localhost:5173)'}`);
  console.log(`Transport Mode:           ${isCustom ? 'Production Real SMTP' : 'Development Ethereal / Console Fallback'}`);
  console.log('==================================================');
};

/**
 * Create a Real SMTP Transporter instance
 */
const createRealSmtpTransporter = () => {
  const host = cleanEnv(process.env.SMTP_HOST);
  const rawPort = cleanEnv(process.env.SMTP_PORT);
  const rawSecure = cleanEnv(process.env.SMTP_SECURE);
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASSWORD);
  const service = cleanEnv(process.env.SMTP_SERVICE);

  const port = Number(rawPort) || 587;

  let secure = false;
  if (rawSecure.toLowerCase() === 'true') {
    secure = true;
  } else if (rawSecure.toLowerCase() === 'false') {
    secure = false;
  } else {
    secure = port === 465;
  }

  if (port === 587 && secure) {
    console.warn('[SMTP Warning] Port 587 configured with secure=true. Correcting to secure=false (STARTTLS) to prevent connection drop.');
    secure = false;
  }

  const transportConfig = {
    auth: { user, pass },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 15000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 15000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 30000,
    tls: {
      rejectUnauthorized: cleanEnv(process.env.SMTP_TLS_REJECT_UNAUTHORIZED) === 'true',
      minVersion: 'TLSv1.2',
    },
  };

  if (service) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = secure;
  }

  return nodemailer.createTransport(transportConfig);
};

/**
 * Create Ethereal SMTP Transporter instance
 */
const createEtherealTransporter = (account) => {
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 15000,
  });
};

/**
 * Create Development Console / JSON Transporter
 * Used when real SMTP and Ethereal are unavailable in development.
 */
const createConsoleTransporter = () => {
  const jsonTransporter = nodemailer.createTransport({ jsonTransport: true });
  // Ensure .verify() returns a resolving promise for compatibility
  jsonTransporter.verify = async () => true;
  return jsonTransporter;
};

/**
 * Initialize or get Ethereal test account with timeout protection
 */
const initEtherealAccount = async () => {
  if (etherealAccount) return etherealAccount;
  if (etherealFailed) {
    throw new Error('Ethereal test account previous attempt failed; using console transport.');
  }

  const timeoutMs = Number(process.env.ETHEREAL_TIMEOUT_MS) || 6000;
  try {
    const accountPromise = nodemailer.createTestAccount();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Ethereal creation timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    etherealAccount = await Promise.race([accountPromise, timeoutPromise]);
    return etherealAccount;
  } catch (err) {
    etherealFailed = true;
    throw err;
  }
};

/**
 * Extract verification / action URL from email contents or options
 */
const extractActionUrl = (options = {}) => {
  if (options.actionUrl) return options.actionUrl;
  if (options.verificationUrl) return options.verificationUrl;
  if (options.resetUrl) return options.resetUrl;

  const urlRegex = /(https?:\/\/[^\s"'<>\)]+)/gi;
  if (options.text) {
    const matches = options.text.match(urlRegex);
    if (matches && matches.length > 0) {
      const actionMatch = matches.find((u) => /verify|reset|token/i.test(u));
      return actionMatch || matches[0];
    }
  }
  if (options.html) {
    const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    const matches = [];
    let match;
    while ((match = hrefRegex.exec(options.html)) !== null) {
      matches.push(match[1]);
    }
    if (matches.length > 0) {
      const actionMatch = matches.find((u) => /verify|reset|token/i.test(u));
      return actionMatch || matches[0];
    }
  }
  return null;
};

/**
 * Formatted console output for local development fallback
 */
const logConsoleDelivery = ({ to, from, subject, actionUrl, actionType, text }) => {
  console.log('\n' + '='.repeat(72));
  console.log(' [DEVELOPMENT EMAIL FALLBACK - CONSOLE TRANSPORT]');
  console.log('='.repeat(72));
  console.log(` To:        ${to}`);
  console.log(` From:      ${from}`);
  console.log(` Subject:   ${subject}`);
  if (actionType) {
    console.log(` Purpose:   ${actionType}`);
  }
  console.log('-'.repeat(72));
  if (actionUrl) {
    console.log(' 🔗 VERIFICATION / ACTION LINK:');
    console.log(`    ${actionUrl}`);
    console.log('');
    console.log('    👉 Click or copy the URL above to proceed in your browser.');
    console.log('-'.repeat(72));
  }
  if (text) {
    const previewLines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join('\n    ');
    console.log(' 📄 Message Summary:');
    console.log(`    ${previewLines}`);
    console.log('-'.repeat(72));
  }
  console.log('='.repeat(72) + '\n');
};

/**
 * Deliver email directly via Development Console Transport
 */
const sendViaConsole = async ({ to, subject, html, text, from, actionUrl, actionType }) => {
  logConsoleDelivery({
    to,
    from,
    subject,
    actionUrl,
    actionType,
    text,
  });

  const consoleTransporter = createConsoleTransporter();
  let info = {};
  try {
    info = await consoleTransporter.sendMail({ from, to, subject, text, html });
  } catch (_) {
    info = {
      messageId: `<chatflow-dev-${Date.now()}@local>`,
      accepted: [to],
      rejected: [],
      response: '250 Dev Console OK',
    };
  }

  return {
    success: true,
    messageId: info.messageId || `<chatflow-dev-${Date.now()}@local>`,
    accepted: [to],
    rejected: [],
    response: info.response || '250 Dev Console OK',
    previewUrl: null,
    fallback: true,
    transportMode: 'console',
  };
};

/**
 * Initialize or get active Nodemailer Transporter
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (isInitializing) {
    return isInitializing;
  }

  isInitializing = (async () => {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const isCustom = hasRealSmtpConfig();

      logSmtpDiagnostics();

      // 1. REAL SMTP (Highest priority when credentials are provided)
      if (isCustom) {
        transporter = createRealSmtpTransporter();
        currentTransportMode = 'real_smtp';
        console.log(`[SMTP] Initialized production SMTP transport (${process.env.SMTP_SERVICE || `${cleanEnv(process.env.SMTP_HOST)}:${cleanEnv(process.env.SMTP_PORT) || 587}`})`);
        return transporter;
      }

      // 2. PRODUCTION SAFETY: In production, missing credentials must fail strictly
      if (isProd) {
        throw new Error('SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured in production environment.');
      }

      // 3. DEVELOPMENT: Attempt Ethereal Test Account
      console.log('[SMTP] No explicit SMTP_HOST/USER in environment. Initializing real Ethereal SMTP test transport...');
      try {
        const account = await initEtherealAccount();
        transporter = createEtherealTransporter(account);
        currentTransportMode = 'ethereal';
        console.log(`[SMTP] Real Ethereal SMTP transport active: host=${account.smtp.host}, user=${account.user}`);
        return transporter;
      } catch (etherealErr) {
        // 4. DEVELOPMENT FALLBACK: Ethereal failed -> use Console Transport
        console.warn(`[SMTP Warning] Ethereal test account unavailable (${etherealErr.message}).`);
        console.log('[SMTP] Falling back to Development Console Transport (verification links printed to terminal).');
        transporter = createConsoleTransporter();
        currentTransportMode = 'console';
        return transporter;
      }
    } finally {
      isInitializing = null;
    }
  })();

  return isInitializing;
};

/**
 * Verify SMTP connection during startup or health check
 */
const verifySmtpConnection = async () => {
  try {
    const t = await getTransporter();

    if (currentTransportMode === 'console') {
      console.log('[SMTP] Development Console Fallback Transport is active.');
      return {
        success: true,
        message: 'Console fallback transport active (development mode)',
        mode: 'console',
      };
    }

    await t.verify();
    console.log('[SMTP] ✓ Connection and authentication verified successfully.');
    return {
      success: true,
      message: 'SMTP connection verified successfully',
      mode: currentTransportMode,
    };
  } catch (err) {
    console.error('[SMTP] ✗ Connection verification failed:', {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      console.warn('[SMTP] In development mode, email operations will automatically fall back to console logging if SMTP fails.');
      transporter = createConsoleTransporter();
      currentTransportMode = 'console';
      return {
        success: true,
        message: `SMTP verification failed (${err.message}). Switched to development console transport.`,
        mode: 'console',
        fallback: true,
      };
    }

    return {
      success: false,
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    };
  }
};

/**
 * Core send email function with resilient delivery & development console fallback
 */
const sendMail = async ({
  to,
  subject,
  html,
  text,
  actionUrl,
  verificationUrl,
  resetUrl,
  actionType,
}) => {
  if (!to) {
    throw new Error('Recipient email address ("to") is required.');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const resolvedActionUrl = extractActionUrl({ actionUrl, verificationUrl, resetUrl, text, html });

  let t;
  try {
    t = await getTransporter();
  } catch (err) {
    if (isProd) {
      throw err;
    }
    console.warn(`[SMTP Warning] getTransporter error in development: ${err.message}. Using Console Transport.`);
    transporter = createConsoleTransporter();
    currentTransportMode = 'console';
    t = transporter;
  }

  const rawFromEmail = cleanEnv(process.env.FROM_EMAIL);
  const rawUser = cleanEnv(process.env.SMTP_USER);
  const rawFromName = cleanEnv(process.env.FROM_NAME);

  const fromEmail =
    rawFromEmail ||
    rawUser ||
    (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.local');
  const fromName = rawFromName || 'ChatFlow';
  const from = `"${fromName}" <${fromEmail}>`;

  // 1. If currently in Console Mode, send via Console directly
  if (currentTransportMode === 'console') {
    return await sendViaConsole({
      to,
      subject,
      html,
      text,
      from,
      actionUrl: resolvedActionUrl,
      actionType,
    });
  }

  // 2. Try sending with current active transporter (Real SMTP or Ethereal)
  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    console.log(
      `[SMTP] Message accepted by ${currentTransportMode === 'real_smtp' ? 'real SMTP' : 'Ethereal'}: messageId=${info.messageId}, accepted=${JSON.stringify(info.accepted)}`
    );
    if (previewUrl) {
      console.log(`[SMTP] Real test mailbox preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      previewUrl,
      transportMode: currentTransportMode,
    };
  } catch (sendError) {
    // In production: Fail strictly, do NOT bypass email verification
    if (isProd) {
      console.error('[SMTP] Production SMTP delivery failed:', {
        message: sendError.message,
        code: sendError.code,
        command: sendError.command,
        response: sendError.response,
        responseCode: sendError.responseCode,
        recipient: maskEmail(to),
      });
      throw sendError;
    }

    // In development: Handle fallback gracefully
    console.warn(`[SMTP Warning] ${currentTransportMode === 'real_smtp' ? 'Real SMTP' : 'Ethereal'} send failed: ${sendError.message}`);

    // If Real SMTP failed in development, try Ethereal first
    if (currentTransportMode === 'real_smtp' && !etherealFailed) {
      console.log('[SMTP] Attempting Ethereal test fallback in development...');
      try {
        const account = await initEtherealAccount();
        const etherealTransporter = createEtherealTransporter(account);
        const etherealFrom = `"${fromName}" <${account.user}>`;
        const info = await etherealTransporter.sendMail({
          from: etherealFrom,
          to,
          subject,
          text,
          html,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info) || null;
        console.log(`[SMTP] Fallback to Ethereal succeeded: messageId=${info.messageId}`);
        if (previewUrl) {
          console.log(`[SMTP] Real test mailbox preview URL: ${previewUrl}`);
        }

        transporter = etherealTransporter;
        currentTransportMode = 'ethereal';

        return {
          success: true,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          previewUrl,
          fallback: true,
          transportMode: 'ethereal',
        };
      } catch (etherealErr) {
        console.warn(`[SMTP Warning] Ethereal fallback failed (${etherealErr.message}). Switching to Console Transport.`);
      }
    }

    // If both real SMTP and Ethereal failed (or Ethereal was unavailable), fall back to Console Transport
    console.log('[SMTP] Using Development Console Transport fallback.');
    transporter = createConsoleTransporter();
    currentTransportMode = 'console';

    return await sendViaConsole({
      to,
      subject,
      html,
      text,
      from,
      actionUrl: resolvedActionUrl,
      actionType,
    });
  }
};

/**
 * Send Account Verification Email
 */
const sendVerificationEmail = async ({ to, name, token, req }) => {
  const clientUrl = resolveClientUrl(req);
  const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const template = verifyEmailTemplate({
    name: name || 'ChatFlow User',
    verificationUrl,
  });

  return await sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    actionUrl: verificationUrl,
    actionType: 'Account Verification',
  });
};

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async ({ to, name, token, req }) => {
  const clientUrl = resolveClientUrl(req);
  const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const template = resetPasswordTemplate({
    name: name || 'ChatFlow User',
    resetUrl,
  });

  return await sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    actionUrl: resetUrl,
    actionType: 'Password Reset',
  });
};

/**
 * Send Password Changed Security Notification
 */
const sendPasswordChangedEmail = async ({ to, name, timestamp }) => {
  const template = passwordChangedTemplate({
    name: name || 'ChatFlow User',
    timestamp,
  });

  return await sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    actionType: 'Password Changed Notification',
  });
};

/**
 * Send Account Deleted Security Notification
 */
const sendAccountDeletedEmail = async ({ to, name }) => {
  const template = accountDeletedTemplate({
    name: name || 'ChatFlow User',
  });

  return await sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    actionType: 'Account Deleted Notification',
  });
};

/**
 * Safe SMTP Status for Health Check (never reveals credentials)
 */
const getSmtpStatus = () => {
  const host = cleanEnv(process.env.SMTP_HOST) || (etherealAccount ? etherealAccount.smtp.host : 'unconfigured');
  const port = Number(cleanEnv(process.env.SMTP_PORT)) || (etherealAccount ? etherealAccount.smtp.port : 587);
  const secure = cleanEnv(process.env.SMTP_SECURE) === 'true' || (etherealAccount ? etherealAccount.smtp.secure : port === 465);
  const isCustom = hasRealSmtpConfig();

  let provider = 'unconfigured';
  if (isCustom) {
    provider = 'custom_smtp';
  } else if (currentTransportMode === 'ethereal' || etherealAccount) {
    provider = 'ethereal_test_smtp';
  } else if (currentTransportMode === 'console') {
    provider = 'console_dev_fallback';
  }

  return {
    configured: Boolean(transporter || isCustom || currentTransportMode === 'console'),
    provider,
    transportMode: currentTransportMode || (isCustom ? 'real_smtp' : 'uninitialized'),
    host: host ? (host.includes('.') ? `${host.substring(0, 4)}***.${host.split('.').slice(-2).join('.')}` : host) : currentTransportMode === 'console' ? 'console-local' : 'none',
    port,
    secure,
    fromEmail: cleanEnv(process.env.FROM_EMAIL) || cleanEnv(process.env.SMTP_USER) || (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.local'),
    fromName: cleanEnv(process.env.FROM_NAME) || 'ChatFlow',
    clientUrl: resolveClientUrl(),
  };
};

module.exports = {
  getTransporter,
  verifySmtpConnection,
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  getSmtpStatus,
  resolveClientUrl,
};
