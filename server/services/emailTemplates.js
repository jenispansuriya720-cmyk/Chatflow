/**
 * ChatFlow Reusable Email Templates
 * Responsive, branded, mobile-friendly with plain-text fallbacks.
 */

const baseEmailWrapper = ({ title, preheader, contentHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px 28px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 12px;
      color: #ffffff;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .body {
      padding: 36px 32px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    h1 {
      margin-top: 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
    }
    .info-box {
      background-color: #f1f5f9;
      border-left: 4px solid #6366f1;
      padding: 14px 18px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 13px;
      color: #475569;
    }
    .warning-box {
      background-color: #fff1f2;
      border-left: 4px solid #f43f5e;
      padding: 14px 18px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 13px;
      color: #9f1239;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .fallback-url {
      word-break: break-all;
      color: #6366f1;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">⚡ ChatFlow</div>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This email was sent by <strong>ChatFlow Security</strong>.</p>
        <p style="margin: 0;">© ${new Date().getFullYear()} ChatFlow, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. Verification Email Template
 */
const verifyEmailTemplate = ({ name, verificationUrl }) => {
  const contentHtml = `
    <h1>Verify your ChatFlow account</h1>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Thank you for creating your ChatFlow account. Please verify your email address to activate your account and start messaging securely with your team and friends.</p>
    
    <div class="button-container">
      <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">Verify Email</a>
    </div>

    <div class="info-box">
      <strong>⏱ Expiration:</strong> This verification link expires after <strong>24 hours</strong>.
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If the button above doesn't work, copy and paste this link into your browser:
      <br />
      <a href="${verificationUrl}" class="fallback-url">${verificationUrl}</a>
    </p>

    <p style="font-size: 13px; color: #94a3b8; margin-top: 28px;">
      If you did not create this account, please ignore this email. No account will be activated without verification.
    </p>
  `;

  const textFallback = `
Hello ${name},

Thank you for creating your ChatFlow account.

Please verify your email address using the following link:
${verificationUrl}

This link expires after 24 hours.

If you did not create this account, you can safely ignore this email.

— The ChatFlow Team
`.trim();

  return {
    subject: 'Verify your ChatFlow account',
    html: baseEmailWrapper({
      title: 'Verify your ChatFlow account',
      preheader: 'Please verify your email address to activate your ChatFlow account.',
      contentHtml,
    }),
    text: textFallback,
  };
};

/**
 * 2. Password Reset Email Template
 */
const resetPasswordTemplate = ({ name, resetUrl }) => {
  const contentHtml = `
    <h1>Reset your ChatFlow password</h1>
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your ChatFlow password. Click the button below to choose a new, secure password.</p>

    <div class="button-container">
      <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>

    <div class="info-box">
      <strong>⏱ Security note:</strong> This password reset link expires after <strong>1 hour</strong> and can only be used once.
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If the button above doesn't work, copy and paste this URL into your browser:
      <br />
      <a href="${resetUrl}" class="fallback-url">${resetUrl}</a>
    </p>

    <div class="warning-box">
      If you did not request this password reset, please ignore this email or change your password if you suspect unauthorized access. Your account remains secure.
    </div>
  `;

  const textFallback = `
Hello ${name},

We received a request to reset your ChatFlow password.

Please reset your password using the following link:
${resetUrl}

This link expires after 1 hour and can only be used once.

If you did not request this, you can safely ignore this email.

— The ChatFlow Team
`.trim();

  return {
    subject: 'Reset your ChatFlow password',
    html: baseEmailWrapper({
      title: 'Reset your ChatFlow password',
      preheader: 'Instructions for resetting your ChatFlow account password.',
      contentHtml,
    }),
    text: textFallback,
  };
};

/**
 * 3. Password Changed Security Notification Template
 */
const passwordChangedTemplate = ({ name, timestamp }) => {
  const dateStr = timestamp || new Date().toUTCString();
  const contentHtml = `
    <h1>Your ChatFlow password was changed</h1>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your ChatFlow account password was successfully changed on <strong>${dateStr}</strong>.</p>

    <div class="info-box">
      ✓ If you made this change, no further action is required. All existing sessions on other devices have been secured.
    </div>

    <div class="warning-box">
      <strong>Didn't make this change?</strong> If you did not change your password, someone may have accessed your account. Please reset your password immediately and contact ChatFlow Support.
    </div>
  `;

  const textFallback = `
Hello ${name},

Your ChatFlow password was successfully changed on ${dateStr}.

If you made this change, no action is required.

If you did not make this change, please secure your account immediately by resetting your password.

— The ChatFlow Team
`.trim();

  return {
    subject: 'Your ChatFlow password was changed',
    html: baseEmailWrapper({
      title: 'Your ChatFlow password was changed',
      preheader: 'Security Notice: Your ChatFlow account password was changed.',
      contentHtml,
    }),
    text: textFallback,
  };
};

/**
 * 4. Account Deleted Security / Confirmation Template
 */
const accountDeletedTemplate = ({ name }) => {
  const contentHtml = `
    <h1>Your ChatFlow account was deleted</h1>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your ChatFlow account and all associated personal data have been permanently deleted as requested.</p>

    <div class="info-box">
      All your posts, stories, reels, messages, and account credentials have been removed in accordance with our data privacy policy.
    </div>

    <div class="warning-box">
      If you did not authorize this action, please contact ChatFlow support immediately at support@chatflow.com.
    </div>

    <p>We are sorry to see you go. If you ever decide to return, you can create a new account at any time.</p>
  `;

  const textFallback = `
Hello ${name},

Your ChatFlow account has been deleted.

All your posts, stories, reels, messages, and account credentials have been removed.

If you did not request this action, contact ChatFlow support immediately.

— The ChatFlow Team
`.trim();

  return {
    subject: 'Your ChatFlow account was deleted',
    html: baseEmailWrapper({
      title: 'Your ChatFlow account was deleted',
      preheader: 'Confirmation: Your ChatFlow account has been deleted.',
      contentHtml,
    }),
    text: textFallback,
  };
};

module.exports = {
  verifyEmailTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
  accountDeletedTemplate,
};
