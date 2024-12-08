const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Mailgun Configuration
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

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
  const { redis } = fastify;

  fastify.post('/api/send-email', async (request, reply) => {
    const { to, subject, text } = request.body;

    try {
      const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `Sender <${process.env.MAILGUN_SENDER}>`,
        to: [to],
        subject: subject,
        text: text
      });

      reply.send({
        success: true,
        messageId: result.id
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  fastify.post('/api/request-otp', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: 'Email is required'
      });
    }

    try {
      // Check if there's an existing OTP attempt
      const rateLimitKey = `ratelimit:${email}`;
      const attempts = await redis.incr(rateLimitKey);
      
      // Set expiry for rate limit key if it's new - now 5 minutes
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 300); // 5 minutes expiry
      }

      // Rate limit: maximum 5 OTP requests per 5 minutes
      if (attempts > 5) {
        return reply.status(429).send({
          success: false,
          error: 'Too many OTP requests. Please try again later.'
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpKey = `otp:${email}`;

      // Store OTP data in Redis
      await redis.hSet(otpKey, {
        otp,
        attempts: '0',
        timestamp: Date.now().toString()
      });
      
      // Set OTP expiry (5 minutes)
      await redis.expire(otpKey, 300);

      // Send email using Resend
      const result = await sendUsingResend(
        process.env.RESEND_DOMAIN,
        `Nephilim Pi <${process.env.RESEND_SENDER}>`,
        email,
        'Your Login OTP',
        `Your OTP for login is: ${otp}\n\nThis OTP will expire in 5 minutes.`,
        getEmailOtpTemplate(otp)
      );

      if (result?.error && result.error?.message) {
        throw new Error(result.error.message);
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
      await redis.del(`otp:${email}`);

      reply.status(500).send({
        success: false,
        error: `Failed to send OTP: ${error}`
      });
    }
  });

  fastify.post('/api/verify-otp', async (request, reply) => {
    const { email, otp } = request.body;

    if (!email || !otp) {
      return reply.status(400).send({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    try {
      const otpKey = `otp:${email}`;
      const storedData = await redis.hGetAll(otpKey);

      if (!storedData || Object.keys(storedData).length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'OTP expired or not found'
        });
      }

      // Check if OTP is expired (5 minutes)
      const timestamp = parseInt(storedData.timestamp);
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        await redis.del(otpKey);
        return reply.status(400).send({
          success: false,
          error: 'OTP expired'
        });
      }

      // Check maximum attempts (3)
      const attempts = parseInt(storedData.attempts);
      if (attempts >= 3) {
        await redis.del(otpKey);
        return reply.status(400).send({
          success: false,
          error: 'Too many invalid attempts'
        });
      }

      // Verify OTP
      if (storedData.otp !== otp) {
        await redis.hIncrBy(otpKey, 'attempts', 1);
        return reply.status(400).send({
          success: false,
          error: 'Invalid OTP'
        });
      }

      // OTP verified successfully
      await redis.del(otpKey);
      // Also clear rate limit
      await redis.del(`ratelimit:${email}`);

      reply.send({
        success: true,
        message: 'OTP verified successfully'
      });

    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Error verifying OTP'
      });
    }
  });
}

module.exports = routes;

function getEmailOtpTemplate(otp) {
  return `
    <h2>Your Login OTP</h2>
    <p>Use the following OTP to complete your login:</p>
    <h1 style="font-size: 36px; letter-spacing: 5px; color: #4a5568;">${otp}</h1>
    <p>This OTP will expire in 5 minutes.</p>
    <p>If you didn't request this OTP, please ignore this email.</p>
  `;
}