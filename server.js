require('dotenv').config()
const fastify = require('fastify')({ logger: true })
fastify.register(require('@fastify/redis'), {
  host: process.env.REDIS_HOST || '192.168.0.128',
  port: process.env.REDIS_PORT || 6379,
  // password: process.env.REDIS_PASSWORD,  // If using Redis auth
  closeClient: true
});

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

fastify.register(require('./routes/smtp'))
fastify.get('/api/test-redis', async (request, reply) => {
  const { redis } = fastify;
  
  // Example: Increment a counter
  const count = await redis.incr('visits');
  
  return { count };
});
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