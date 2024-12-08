
const FormData = require('form-data')
const Mailgun = require('mailgun.js')
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}
// Mailgun Configuration
const mailgun = new Mailgun(FormData)
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
})
const otpStore = new Map();


async function sendUsingMailGun(domain, from, to, subject, text, html) {
  const result = await mg.messages.create(domain, {
    from,
    to: [to],
    subject,
    text,
    html
  });
  return result;
}
async function sendUsingResend(domain, from, to, subject, text, html) {
  const result = await resend.emails.send({
    from,
    to: [to],
    subject,

    html
  });
  return result;
}
async function routes(fastify, options) {
  // Get all users
  fastify.post('/api/send-email', async (request, reply) => {
    const { to, subject, text } = request.body

    try {
      const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `Sender <${process.env.MAILGUN_SENDER}>`,
        to: [to],
        subject: subject,
        text: text
      })

      reply.send({
        success: true,
        messageId: result.id
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: error.message
      })
    }
  })

  fastify.post('/api/request-otp', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: 'Email is required'
      });
    }

    try {
      // Generate OTP
      const otp = generateOTP();

      // Store OTP with timestamp (expires in 5 minutes)
      otpStore.set(email, {
        otp,
        timestamp: Date.now(),
        attempts: 0
      });

      // Send email using Mailgun
      const result = await sendUsingResend(process.env.RESEND_DOMAIN,
        `Nephilim Pi <${process.env.RESEND_SENDER}>`,
        email,
        'Your Login OTP',
        `Your OTP for login is: ${otp}\n\nThis OTP will expire in 5 minutes.`,
        getEmailOtpTemplate(otp)
      );
      if(result?.error && result.error?.message){
        throw new Error(result.error.message)
      }
      // Clean up expired OTPs
      for (const [storedEmail, data] of otpStore) {
        if (Date.now() - data.timestamp > 5 * 60 * 1000) {
          otpStore.delete(storedEmail);
        }
      }

      reply.send({
        success: true,
        messageId: result.id,
        result,
        message: 'OTP sent successfully'
      });

    } catch (error) {
      fastify.log.error(error);

      // Clean up OTP if email sending fails
      otpStore.delete(email);

      reply.status(500).send({
        success: false,
        error: `Failed to send OTP : ${error}`
      });
    }
  });

  // Endpoint to verify OTP
  fastify.post('/api/verify-otp', async (request, reply) => {
    const { email, otp } = request.body;

    if (!email || !otp) {
      return reply.status(400).send({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return reply.status(400).send({
        success: false,
        error: 'OTP expired or not found'
      });
    }

    // Check if OTP is expired (5 minutes)
    if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
      otpStore.delete(email);
      return reply.status(400).send({
        success: false,
        error: 'OTP expired'
      });
    }

    // Check maximum attempts (3)
    if (storedData.attempts >= 3) {
      otpStore.delete(email);
      return reply.status(400).send({
        success: false,
        error: 'Too many invalid attempts'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts++;
      return reply.status(400).send({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // OTP verified successfully
    otpStore.delete(email);

    reply.send({
      success: true,
      message: 'OTP verified successfully'
    });
  });

}

module.exports = routes


function getEmailOtpTemplate(otp) {
  return `
        <h2>Your Login OTP</h2>
        <p>Use the following OTP to complete your login:</p>
        <h1 style="font-size: 36px; letter-spacing: 5px; color: #4a5568;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      `
}