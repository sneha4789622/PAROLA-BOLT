const nodemailer = require('nodemailer');
const https = require('https');

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

const isMsg91Configured = () =>
  process.env.MSG91_API_KEY &&
  process.env.MSG91_API_KEY.length > 10;

const isFast2SmsConfigured = () =>
  process.env.FAST2SMS_API_KEY &&
  process.env.FAST2SMS_API_KEY !== 'your_fast2sms_api_key';

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

// ─── Send OTP SMS — auto-selects best available provider ─────────────────────
const sendOtpSms = async ({ to, otp, purpose }) => {

  // Priority 1: MSG91 (India — genuinely free trial, 100 SMS)
  if (isMsg91Configured()) {
    try {
      return await sendMsg91Sms({ to, otp });
    } catch (err) {
      console.error('MSG91 failed, trying fallback:', err.message);
    }
  }

  // Priority 2: Fast2SMS (India — needs ₹100 recharge for API)
  if (isFast2SmsConfigured()) {
    try {
      return await sendFast2Sms({ to, otp });
    } catch (err) {
      console.error('Fast2SMS failed, trying fallback:', err.message);
    }
  }

  // Priority 3: Twilio (International — paid for India)
  if (isTwilioConfigured()) {
    try {
      return await sendTwilioSms({ to, otp });
    } catch (err) {
      console.error('Twilio failed:', err.message);
    }
  }

  // Dev mode fallback — print OTP to console + return in API response
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     📱  OTP (Dev Mode - No SMS)      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  To      : ${String(to).padEnd(27)}║`);
  console.log(`║  OTP     : ${String(otp).padEnd(27)}║`);
  console.log(`║  Purpose : ${String(purpose).padEnd(27)}║`);
  console.log('╚══════════════════════════════════════╝\n');
  return { simulated: true, otp };
};

// ─── MSG91 (India — best free option) ────────────────────────────────────────
const sendMsg91Sms = ({ to, otp }) => {
  return new Promise((resolve, reject) => {
    // Strip to 10-digit Indian number
    const mobile = String(to).replace(/\D/g, '').slice(-10);
    const senderId = process.env.MSG91_SENDER_ID || 'OTPSMS';

    const postData = JSON.stringify({
      sender: senderId,
      route: '4',          // Transactional route
      country: '91',
      sms: [
        {
          message: `Your Parola Bolt OTP is ${otp}. Valid for 5 minutes. Do NOT share with anyone. -Parola Bolt`,
          to: [mobile],
        },
      ],
    });

    const options = {
      hostname: 'api.msg91.com',
      path: '/api/v2/sendsms',
      method: 'POST',
      headers: {
        authkey: process.env.MSG91_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'success') {
            console.log(`✅ MSG91 OTP SMS sent to ${to}`);
            resolve({ sent: true });
          } else {
            console.error('❌ MSG91 error:', JSON.stringify(parsed));
            reject(new Error(parsed.message || 'MSG91 send failed'));
          }
        } catch (e) {
          console.error('MSG91 raw response:', data);
          reject(new Error('MSG91 response parse error'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// ─── Fast2SMS ─────────────────────────────────────────────────────────────────
const sendFast2Sms = ({ to, otp }) => {
  return new Promise((resolve, reject) => {
    const mobile = String(to).replace(/\D/g, '').slice(-10);
    const message = `Your Parola Bolt OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
    const postData = JSON.stringify({
      route: 'q',
      message,
      language: 'english',
      flash: 0,
      numbers: mobile,
    });

    const options = {
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.return === true) {
            console.log(`✅ Fast2SMS OTP sent to ${to}`);
            resolve({ sent: true });
          } else {
            reject(new Error(parsed.message?.[0] || 'Fast2SMS send failed'));
          }
        } catch (e) {
          reject(new Error('Fast2SMS response parse error'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// ─── Twilio ───────────────────────────────────────────────────────────────────
const sendTwilioSms = async ({ to, otp }) => {
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body: `Your Parola Bolt OTP is: ${otp}. Valid for 5 minutes. Never share this code.`,
    from: process.env.SMS_FROM_NUMBER,
    to: String(to),
  });
  console.log(`✅ Twilio OTP SMS sent to ${to}`);
  return { sent: true };
};

module.exports = { generateOtp, sendOtpEmail, sendOtpSms, isEmailConfigured };
