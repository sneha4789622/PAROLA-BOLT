const nodemailer = require('nodemailer');

// Create transporter — uses Gmail by default.
// Set EMAIL_HOST/PORT for custom SMTP (e.g. SendGrid, Mailgun).
const createTransporter = () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Gmail shortcut
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
    },
  });
};

/**
 * Generate a 6-digit OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via email
 */
const sendOtpEmail = async ({ to, otp, purpose, fullName = '' }) => {
  // In development without email creds, just log and return
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
    console.log(`\n📧 [EMAIL OTP - DEV MODE]`);
    console.log(`   To      : ${to}`);
    console.log(`   OTP     : ${otp}`);
    console.log(`   Purpose : ${purpose}`);
    console.log(`   (Set EMAIL_USER + EMAIL_PASS in .env to send real emails)\n`);
    return { simulated: true };
  }

  const subjects = {
    login: 'Your Parola Bolt Login OTP',
    forgot_password: 'Reset Your Parola Bolt Password',
    verify_email: 'Verify Your Parola Bolt Email',
  };

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Parola Bolt" <${process.env.EMAIL_USER}>`,
    to,
    subject: subjects[purpose] || 'Parola Bolt OTP',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#f4f2ff;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#6D5DFC;display:inline-flex;padding:12px;border-radius:12px;">
            <span style="color:#FFB100;font-size:24px;font-weight:700;">⚡</span>
          </div>
          <h1 style="color:#221A59;font-size:22px;margin:12px 0 4px;">Parola Bolt</h1>
          <p style="color:#666;font-size:13px;margin:0;">Fast. Verified. Real.</p>
        </div>

        <div style="background:white;border-radius:12px;padding:24px;text-align:center;">
          <h2 style="color:#221A59;margin:0 0 8px;">${purpose === 'forgot_password' ? 'Password Reset' : 'Your OTP Code'}</h2>
          <p style="color:#555;font-size:14px;margin:0 0 20px;">
            ${fullName ? `Hi ${fullName},` : 'Hi,'} use the code below.
            It expires in <strong>5 minutes</strong>.
          </p>

          <div style="background:#F4F2FF;border-radius:12px;padding:20px;margin:16px 0;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#6D5DFC;">${otp}</span>
          </div>

          <p style="color:#999;font-size:12px;margin:16px 0 0;">
            Never share this OTP with anyone. Parola Bolt staff will never ask for your OTP.
          </p>
        </div>

        <p style="text-align:center;color:#aaa;font-size:11px;margin:16px 0 0;">
          © ${new Date().getFullYear()} Parola Bolt. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });

  return { sent: true };
};

/**
 * Simulate SMS OTP (replace with Twilio when ready)
 */
const sendOtpSms = async ({ to, otp, purpose }) => {
  console.log(`\n📱 [SMS OTP - SIMULATED]`);
  console.log(`   To      : ${to}`);
  console.log(`   OTP     : ${otp}`);
  console.log(`   Purpose : ${purpose}`);
  console.log(`   (Integrate Twilio in SMS_FALLBACK_MODE=live to send real SMS)\n`);
  return { simulated: true };
};

module.exports = { generateOtp, sendOtpEmail, sendOtpSms };
