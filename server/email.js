import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'

const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase()
const smtpUser = process.env.GMAIL_SMTP_USER || ''
const smtpPass = process.env.GMAIL_SMTP_PASS || ''
const sendgridApiKey = process.env.SENDGRID_API_KEY || ''
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || ''
const sendgridFromName = process.env.SENDGRID_FROM_NAME || ''
const sendgridReplyTo = process.env.SENDGRID_REPLY_TO || ''
const serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001'
const appName = 'SafeChat'

const createTransporter = () => {
  if (!smtpUser || !smtpPass) {
    throw new Error('Missing Gmail SMTP credentials')
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

const sendEmail = async ({ to, subject, html }) => {
  if (emailProvider === 'sendgrid') {
    if (!sendgridApiKey || !sendgridFromEmail) {
      throw new Error('Missing SendGrid credentials')
    }
    sgMail.setApiKey(sendgridApiKey)
    await sgMail.send({
      to,
      from: {
        email: sendgridFromEmail,
        name: sendgridFromName || appName,
      },
      replyTo: sendgridReplyTo || undefined,
      subject,
      html,
    })
    return
  }
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${appName} <${smtpUser}>`,
    to,
    subject,
    html,
  })
}

export const buildVerifyEmailHtml = ({ displayName, verifyUrl }) => `
  <div style="background:#0b1a33;padding:32px;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#0f2146;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);">
      <div style="padding:28px 28px 0;">
        <h1 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Verify your email</h1>
        <p style="color:#cdd6f4;margin:0 0 18px;font-size:14px;line-height:1.5;">
          Hi ${displayName || 'there'}, welcome to ${appName}! Please confirm your email to start chatting.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
          Verify email
        </a>
        <p style="color:#94a3b8;margin:18px 0 0;font-size:12px;line-height:1.5;">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
      </div>
      <div style="margin-top:24px;padding:16px 28px;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="color:#64748b;margin:0;font-size:12px;">${appName}</p>
      </div>
    </div>
  </div>
`

export const sendVerificationEmail = async ({ to, displayName, token }) => {
  const verifyUrl = `${serverBaseUrl}/api/auth/verify?token=${token}`
  const html = buildVerifyEmailHtml({ displayName, verifyUrl })
  await sendEmail({
    to,
    subject: `Verify your ${appName} email`,
    html,
  })
}

export const buildResetEmailHtml = ({ displayName, resetUrl }) => `
  <div style="background:#0b1a33;padding:32px;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#0f2146;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);">
      <div style="padding:28px 28px 0;">
        <h1 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Reset your password</h1>
        <p style="color:#cdd6f4;margin:0 0 18px;font-size:14px;line-height:1.5;">
          Hi ${displayName || 'there'}, we received a request to reset your ${appName} password.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
          Reset password
        </a>
        <p style="color:#94a3b8;margin:18px 0 0;font-size:12px;line-height:1.5;">
          This link expires in 30 minutes. If you didn't request a reset, you can ignore this email.
        </p>
      </div>
      <div style="margin-top:24px;padding:16px 28px;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="color:#64748b;margin:0;font-size:12px;">${appName}</p>
      </div>
    </div>
  </div>
`

export const sendPasswordResetEmail = async ({ to, displayName, token }) => {
  const resetUrl = `${serverBaseUrl}/api/auth/reset?token=${token}`
  const html = buildResetEmailHtml({ displayName, resetUrl })
  await sendEmail({
    to,
    subject: `Reset your ${appName} password`,
    html,
  })
}
