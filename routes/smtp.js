
const FormData = require('form-data')
const Mailgun = require('mailgun.js')

// Mailgun Configuration
const mailgun = new Mailgun(FormData)
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
})

  async function routes(fastify, options) {
    // Get all users
    fastify.post('/send-email', async (request, reply) => {
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
   
  }
  
  module.exports = routes