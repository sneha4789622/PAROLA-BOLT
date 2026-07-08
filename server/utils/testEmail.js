require('dotenv').config();
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('\n🔍 Email Configuration Check:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`EMAIL_USER : ${EMAIL_USER || '❌ NOT SET'}`);
console.log(`EMAIL_PASS : ${EMAIL_PASS ? EMAIL_PASS.slice(0,4) + '************' : '❌ NOT SET'}`);
console.log(`Pass length: ${EMAIL_PASS ? EMAIL_PASS.length + ' chars' : 'N/A'} (should be 16)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!EMAIL_USER || !EMAIL_PASS) {
  console.log('❌ EMAIL_USER or EMAIL_PASS missing in .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

console.log('⏳ Testing SMTP connection to Gmail...\n');

transporter.verify()
  .then(() => {
    console.log('✅ SMTP Connection: SUCCESS!\n');
    console.log('⏳ Sending test OTP email...\n');
    return transporter.sendMail({
      from: `"Parola Bolt Test" <${EMAIL_USER}>`,
      to: EMAIL_USER, // send to yourself
      subject: '✅ Parola Bolt — Test OTP: 123456',
      html: `
        <div style="font-family:Arial;padding:24px;background:#f4f2ff;border-radius:12px;max-width:400px;">
          <h2 style="color:#6D5DFC;">⚡ Parola Bolt</h2>
          <p>Email configuration is working correctly!</p>
          <div style="background:white;padding:16px;border-radius:8px;text-align:center;">
            <p style="font-size:13px;color:#555;">Your test OTP:</p>
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#6D5DFC;">123456</span>
          </div>
          <p style="font-size:12px;color:#999;margin-top:16px;">
            If you received this, OTP emails will work in your app! ✅
          </p>
        </div>
      `,
    });
  })
  .then((info) => {
    console.log('✅ Test email SENT successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Check your inbox: ${EMAIL_USER}`);
    console.log('   (Also check Spam/Junk folder)\n');
  })
  .catch((err) => {
    console.log('❌ FAILED!\n');
    console.log(`Error Code   : ${err.code || 'N/A'}`);
    console.log(`Error Message: ${err.message}\n`);

    if (err.message.includes('534') || err.message.includes('535') || err.message.includes('Username and Password')) {
      console.log('🔑 FIX: Wrong credentials.');
      console.log('   → EMAIL_PASS must be a Gmail APP PASSWORD, not your Gmail login password.');
      console.log('   → Go to: https://myaccount.google.com/apppasswords');
      console.log('   → Create new App Password → copy 16 chars (no spaces) → paste in .env\n');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.log('🌐 FIX: Network/firewall blocking SMTP port 465.');
      console.log('   → Try from a different network (mobile hotspot)');
      console.log('   → Or use port 587 with EMAIL_HOST=smtp.gmail.com in .env\n');
    } else if (err.message.includes('Invalid login')) {
      console.log('🔑 FIX: Invalid login.');
      console.log('   → Make sure 2-Step Verification is ON: https://myaccount.google.com/security');
      console.log('   → Then get App Password: https://myaccount.google.com/apppasswords\n');
    } else {
      console.log('ℹ️  Try these steps:');
      console.log('   1. Enable 2-Step Verification on Google account');
      console.log('   2. Generate new App Password at myaccount.google.com/apppasswords');
      console.log('   3. Paste ONLY the 16 chars (no spaces) in EMAIL_PASS in .env\n');
    }
  });
