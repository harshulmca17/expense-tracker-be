const fastifyPlugin = require('fastify-plugin')

async function dbConnector(fastify, options) {
  fastify.register(require('@fastify/mysql'), {
    promise: true,  // Enable promise-based queries
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  })
}

module.exports = fastifyPlugin(dbConnector)