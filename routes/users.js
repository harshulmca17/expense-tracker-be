async function routes(fastify, options) {
    // Get all users
    fastify.get('/api/users', async (request, reply) => {
      try {
        const connection = await fastify.mysql.getConnection()
        const [rows] = await connection.query(
          'SELECT * FROM users'
        )
        connection.release()
        return { users: rows }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Get user by ID
    fastify.get('/api/users/:id', async (request, reply) => {
      try {
        const connection = await fastify.mysql.getConnection()
        const [rows] = await connection.query(
          'SELECT * FROM users WHERE id = ?',
          [request.params.id]
        )
        connection.release()
        
        if (rows.length === 0) {
          reply.code(404).send({ error: 'User not found' })
          return
        }
        return { user: rows[0] }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Create new user
    fastify.post('/api/users', async (request, reply) => {
      const { name, email,password } = request.body
      try {
        const connection = await fastify.mysql.getConnection()
        const [result] = await connection.query(
          'INSERT INTO users (name, email,password) VALUES (?, ?, ?)',
          [name, email,password]
        )
        connection.release()
        
        reply.code(201).send({
          id: result.insertId,
          name,
          email
        })
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Update user
    fastify.put('/api/users/:id', async (request, reply) => {
      const { name, email } = request.body
      try {
        const connection = await fastify.mysql.getConnection()
        const [result] = await connection.query(
          'UPDATE users SET name = ?, email = ? WHERE id = ?',
          [name, email, request.params.id]
        )
        connection.release()
        
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: 'User not found' })
          return
        }
        return { message: 'User updated successfully' }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  
    // Delete user
    fastify.delete('/api/users/:id', async (request, reply) => {
      try {
        const connection = await fastify.mysql.getConnection()
        const [result] = await connection.query(
          'DELETE FROM users WHERE id = ?',
          [request.params.id]
        )
        connection.release()
        
        if (result.affectedRows === 0) {
          reply.code(404).send({ error: 'User not found' })
          return
        }
        return { message: 'User deleted successfully' }
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    })
  }
  
  module.exports = routes