async function routes(fastify, options) {
    // Get all users
    fastify.get('/api/expenses', async (request, reply) => {
      try {
        const connection = await fastify.mysql.getConnection()
        const {params} = request;
        console.log(params);
        const [rows] = await connection.query(
          'SELECT * FROM expenses'
        )
        connection.release()
        return { result: rows }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Get user by ID
    fastify.get('/api/expenses/:id', async (request, reply) => {
      try {
        const connection = await fastify.mysql.getConnection()
        const [rows] = await connection.query(
          'SELECT * FROM expenses WHERE id = ?',
          [request.params.id]
        )
        connection.release()
        
        if (rows.length === 0) {
          reply.code(404).send({ error: 'Expense not found' })
          return
        }
        return { result: rows[0] }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Create new user
    fastify.post('/api/expenses', async (request, reply) => {
      const { name, userId, title, category, description, amount, config } = request.body
      try {
        const connection = await fastify.mysql.getConnection()
        const [result] = await connection.query(
          'INSERT INTO expenses (name, userId, title, category, description, amount, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, userId, title, category, description, amount, config]
        )
        connection.release()
        
        reply.code(201).send({
          id: result.insertId,
          name,
          title
        })
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
   
  }
  
  module.exports = routes