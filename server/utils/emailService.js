const nodemailer = require('nodemailer');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return (
    user && pass &&
    user !== 'your_email@gmail.com' &&
    pass !== 'your_gmail_app_password' &&
    user.includes('@') &&
    pass.length >= 12
  );
};

const isTwilioConfigured = () =>
  process.env.TWILIO_SID &&
  process.env.TWILIO_SID !== 'dummy' &&
  process.env.TWILIO_AUTH_TOKEN;

// ─── Gmail SMTP ───────────────────────────────────────────────────────────────
const createTransporter = () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

// ─── Send OTP Email ───────────────────────────────────────────────────────────
const sendOtpEmail = async ({ to, otp, purpose, fullName = '' }) => {
  if (!isEmailConfigured()) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║     📧  OTP (Dev Mode - No Email)    ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  To      : ${String(to).padEnd(27)}║`);
    console.log(`║  OTP     : ${String(otp).padEnd(27)}║`);
    console.log(`║  Purpose : ${String(purpose).padEnd(27)}║`);
    console.log('╚══════════════════════════════════════╝\n');
    return { simulated: true, otp };
  }

  const subjects = {
    login: 'Your Parola Bolt Login OTP',
    forgot_password: 'Reset Your Parola Bolt Password',
    verify_email: 'Verify Your Parola Bolt Email',
  };

  let transporter;
  try {
    transporter = createTransporter();
    await transporter.verify();
  } catch (verifyErr) {
    console.error('\n❌ SMTP connection FAILED:', verifyErr.message);
    console.log(`[FALLBACK OTP for ${to}]: ${otp}\n`);
    return { simulated: true, otp, smtpError: verifyErr.message };
  }

  await transporter.sendMail({
    from: `"Parola Bolt" <${process.env.EMAIL_USER}>`,
    to,
    subject: subjects[purpose] || 'Parola Bolt OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f4f2ff;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#6D5DFC;display:inline-flex;padding:12px 20px;border-radius:12px;">
            <span style="color:#FFB100;font-size:22px;font-weight:700;">⚡ Parola Bolt</span>
          </div>
        </div>
        <div style="background:white;border-radius:12px;padding:28px;text-align:center;">
          <h2 style="color:#221A59;margin:0 0 8px;">
            ${purpose === 'forgot_password' ? '🔐 Password Reset OTP' : '🔑 Login OTP'}
          </h2>
          <p style="color:#555;font-size:14px;margin:0 0 24px;">
            ${fullName ? `Hi <b>${fullName}</b>,` : 'Hi,'} your one-time code is below.
            Expires in <b>5 minutes</b>.
          </p>
          <div style="background:#F4F2FF;border-radius:12px;padding:20px 32px;margin:0 0 20px;display:inline-block;">
            <span style="font-size:42px;font-weight:900;letter-spacing:16px;color:#6D5DFC;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#888;font-size:12px;">
            🛡️ Never share this OTP. Parola Bolt will never ask for it.
          </p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:11px;margin:20px 0 0;">
          © ${new Date().getFullYear()} Parola Bolt · If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`✅ OTP email sent to ${to}`);
  return { sent: true };
};

// ─── Send OTP SMS — Firebase handles delivery on frontend ────────────────────
// NOTE: Firebase Phone Auth works differently from other SMS providers.
// The OTP is sent and verified entirely on the FRONTEND using Firebase SDK.
// Backend only needs to verify the Firebase ID token after frontend verification.
const sendOtpSms = async ({ to, otp, purpose }) => {
  // Twilio fallback if configured
  if (isTwilioConfigured()) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your Parola Bolt OTP is: ${otp}. Valid for 5 minutes. Never share this code.`,
        from: process.env.SMS_FROM_NUMBER,
        to: String(to),
      });
      console.log(`✅ Twilio OTP SMS sent to ${to}`);
      return { sent: true };
    } catch (err) {
      console.error('Twilio failed:', err.message);
    }
  }

  // Dev fallback
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     📱  OTP (Dev Mode - No SMS)      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  To      : ${String(to).padEnd(27)}║`);
  console.log(`║  OTP     : ${String(otp).padEnd(27)}║`);
  console.log(`║  Purpose : ${String(purpose).padEnd(27)}║`);
  console.log('╚══════════════════════════════════════╝\n');
  return { simulated: true, otp };
};

module.exports = { generateOtp, sendOtpEmail, sendOtpSms, isEmailConfigured };
