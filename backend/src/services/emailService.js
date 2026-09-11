import nodemailer from 'nodemailer';

/**
 * Send password reset email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.resetToken - Raw unhashed reset token
 * @param {string} options.resetUrl - Full reset URL
 */
export const sendPasswordResetEmail = async ({ to, resetToken, resetUrl }) => {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;

  if (hasSmtpConfig) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'SkillBridge <no-reply@skillbridge.gov.in>',
        to,
        subject: 'SkillBridge — Password Reset Request',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #211A2C;">SkillBridge Password Reset</h2>
            <p>You recently requested to reset your password for your SkillBridge account.</p>
            <p>Click the button below to reset it. This link is valid for <strong>1 hour</strong>.</p>
            <div style="margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: #D85C3F; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br/><code>${resetUrl}</code></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">If you did not request this password reset, please ignore this email.</p>
          </div>
        `,
      });

      console.log(`📧 Password reset email dispatched to ${to}`);
      return { success: true, mode: 'smtp' };
    } catch (error) {
      console.error('❌ SMTP Email sending error:', error.message);
      // Fallback to console
    }
  }

  // Development/Local console log fallback for easy testing
  console.log(`
  ══════════════════════════════════════════════════════════════════
  📧 [EMAIL SERVICE - DEVELOPMENT DISPATCH]
  To:          ${to}
  Subject:     SkillBridge — Password Reset Request
  Reset Token: ${resetToken}
  Reset URL:   ${resetUrl}
  ══════════════════════════════════════════════════════════════════
  `);

  return { success: true, mode: 'console', resetUrl };
};
