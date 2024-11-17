require('dotenv').config()
const fastify = require('fastify')({ logger: true })

fastify.register(require('@fastify/cors'), {
  origin: ['*'],
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  allowedHeaders: ['*'],
  credentials: false
});

// Register plugins
fastify.register(require('./plugins/db'))

// Register routes
fastify.register(require('./routes/users'))


fastify.register(require('./routes/expenses'))

// Run the server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
    fastify.log.info(`Server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()