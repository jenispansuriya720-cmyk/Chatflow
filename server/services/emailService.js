const nodemailer = require('nodemailer');
const {
  verifyEmailTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
  accountDeletedTemplate,
} = require('./emailTemplates');

let transporter = null;
let etherealAccount = null;
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
  const isCustom = Boolean(host && user && pass);

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
  console.log(`Transport Mode:           ${isCustom ? 'Production Real SMTP' : 'Development Ethereal SMTP Test Fallback'}`);
  console.log('==================================================');
};

/**
 * Initialize or get active Nodemailer SMTP Transporter
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (isInitializing) {
    return isInitializing;
  }

  isInitializing = (async () => {
    const host = cleanEnv(process.env.SMTP_HOST);
    const rawPort = cleanEnv(process.env.SMTP_PORT);
    const rawSecure = cleanEnv(process.env.SMTP_SECURE);
    const user = cleanEnv(process.env.SMTP_USER);
    const pass = cleanEnv(process.env.SMTP_PASSWORD);
    const service = cleanEnv(process.env.SMTP_SERVICE);

    const port = Number(rawPort) || 587;

    // Secure calculation:
    // Port 465 requires secure = true (SSL direct).
    // Port 587 and 2525 require secure = false (STARTTLS).
    let secure = false;
    if (rawSecure.toLowerCase() === 'true') {
      secure = true;
    } else if (rawSecure.toLowerCase() === 'false') {
      secure = false;
    } else {
      secure = port === 465;
    }

    // Safety check: Port 587 does not support direct TLS from connection
    if (port === 587 && secure) {
      console.warn('[SMTP Warning] Port 587 configured with secure=true. Correcting to secure=false (STARTTLS) to prevent connection drop.');
      secure = false;
    }

    logSmtpDiagnostics();

    if ((host || service) && user && pass) {
      // Custom real SMTP configuration
      const transportConfig = {
        auth: { user, pass },
        // Cloud-safe timeouts (prevent serverless function hangs)
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

      transporter = nodemailer.createTransport(transportConfig);
      console.log(`[SMTP] Initialized production SMTP transport (${service || `${host}:${port}`}, secure: ${secure})`);
    } else {
      // In development when explicit SMTP credentials are not yet set,
      // create a real test SMTP account via Ethereal Email for authentic SMTP handshakes & inbox verification.
      console.log('[SMTP] No explicit SMTP_HOST/USER in environment. Initializing real Ethereal SMTP test transport...');
      try {
        etherealAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: etherealAccount.smtp.host,
          port: etherealAccount.smtp.port,
          secure: etherealAccount.smtp.secure,
          auth: {
            user: etherealAccount.user,
            pass: etherealAccount.pass,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 30000,
        });
        console.log(`[SMTP] Real Ethereal SMTP transport active: host=${etherealAccount.smtp.host}, user=${etherealAccount.user}`);
      } catch (etherealErr) {
        console.error('[SMTP] Failed to initialize Ethereal SMTP transport:', etherealErr.message);
        throw etherealErr;
      }
    }

    return transporter;
  })();

  return isInitializing;
};

/**
 * Verify SMTP connection during startup or health check
 */
const verifySmtpConnection = async () => {
  try {
    const t = await getTransporter();
    await t.verify();
    console.log('[SMTP] ✓ Connection and authentication verified successfully.');
    return { success: true, message: 'SMTP connection verified successfully' };
  } catch (err) {
    console.error('[SMTP] ✗ Connection verification failed:', {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
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
 * Core send email function with safe delivery diagnostics
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error('Recipient email address ("to") is required.');
  }

  const t = await getTransporter();

  const rawFromEmail = cleanEnv(process.env.FROM_EMAIL);
  const rawUser = cleanEnv(process.env.SMTP_USER);
  const rawFromName = cleanEnv(process.env.FROM_NAME);

  // Critical: If FROM_EMAIL is not specified, default to SMTP_USER
  // to avoid SMTP server rejection (e.g. Gmail 550 5.7.1)
  const fromEmail = rawFromEmail || rawUser || (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.com');
  const fromName = rawFromName || 'ChatFlow';
  const from = `"${fromName}" <${fromEmail}>`;

  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    // Log safe diagnostics (strictly omit any passwords or tokens)
    console.log(
      `[SMTP] Message accepted by SMTP: messageId=${info.messageId}, accepted=${JSON.stringify(info.accepted)}, response="${info.response || 'OK'}"`
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
    };
  } catch (error) {
    console.error('[SMTP] SMTP send failed:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      recipient: maskEmail(to),
    });
    throw error;
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
  });
};

/**
 * Safe SMTP Status for Health Check (never reveals credentials)
 */
const getSmtpStatus = () => {
  const host = cleanEnv(process.env.SMTP_HOST) || (etherealAccount ? etherealAccount.smtp.host : 'unconfigured');
  const port = Number(cleanEnv(process.env.SMTP_PORT)) || (etherealAccount ? etherealAccount.smtp.port : 587);
  const secure = cleanEnv(process.env.SMTP_SECURE) === 'true' || (etherealAccount ? etherealAccount.smtp.secure : port === 465);
  const isCustom = Boolean(cleanEnv(process.env.SMTP_HOST) && cleanEnv(process.env.SMTP_USER));

  return {
    configured: Boolean(transporter || isCustom),
    provider: isCustom ? 'custom_smtp' : etherealAccount ? 'ethereal_test_smtp' : 'unconfigured',
    host: host ? `${host.substring(0, 4)}***.${host.split('.').slice(-2).join('.')}` : 'none',
    port,
    secure,
    fromEmail: cleanEnv(process.env.FROM_EMAIL) || cleanEnv(process.env.SMTP_USER) || (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.com'),
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
