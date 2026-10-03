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
 * Initialize or get active Nodemailer SMTP Transporter
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (isInitializing) {
    return isInitializing;
  }

  isInitializing = (async () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      // Custom real SMTP configuration
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });
      console.log(`[SMTP] Initialized real SMTP transport with host: ${host}:${port} (secure: ${secure})`);
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
    const verified = await t.verify();
    if (verified) {
      console.log('[SMTP] ✓ Connection and authentication verified successfully.');
      return { success: true };
    }
    return { success: false, message: 'SMTP verification did not return true' };
  } catch (err) {
    console.error('[SMTP] ✗ Connection verification failed:', err.message);
    return { success: false, error: err.message };
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

  const fromEmail = process.env.FROM_EMAIL || (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.com');
  const fromName = process.env.FROM_NAME || 'ChatFlow';
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
    console.error(`[SMTP] Failed to deliver message to recipient: ${error.message}`);
    throw error;
  }
};

/**
 * Send Account Verification Email
 */
const sendVerificationEmail = async ({ to, name, token }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
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
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
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
  const host = process.env.SMTP_HOST || (etherealAccount ? etherealAccount.smtp.host : 'unconfigured');
  const port = Number(process.env.SMTP_PORT) || (etherealAccount ? etherealAccount.smtp.port : 587);
  const secure = process.env.SMTP_SECURE === 'true' || (etherealAccount ? etherealAccount.smtp.secure : false);
  const isCustom = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  return {
    configured: Boolean(transporter || isCustom),
    provider: isCustom ? 'custom_smtp' : etherealAccount ? 'ethereal_test_smtp' : 'unconfigured',
    host: host ? `${host.substring(0, 4)}***.${host.split('.').slice(-2).join('.')}` : 'none',
    port,
    secure,
    fromEmail: process.env.FROM_EMAIL || (etherealAccount ? etherealAccount.user : 'no-reply@chatflow.com'),
    fromName: process.env.FROM_NAME || 'ChatFlow',
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
};
