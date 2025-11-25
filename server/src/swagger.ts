export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'QueryCraft API',
    version: '1.0.0',
    description: 'AI-powered SQL query builder API'
  },
  servers: [{ url: '/api/v1', description: 'Current version' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', nullable: true },
          theme: { type: 'string', enum: ['light', 'dark', 'system'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      QueryHistory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
          sql: { type: 'string' },
          dialect: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } } } }
        },
        responses: { 201: { description: 'Created' }, 409: { description: 'Email taken' } }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: { 200: { description: 'Success' }, 401: { description: 'Invalid credentials' } }
      }
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Refresh access token', responses: { 200: { description: 'New tokens' } } }
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get current user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'User object' } } },
      patch: { tags: ['Auth'], summary: 'Update profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated user' } } }
    },
    '/auth/forgot-password': {
      post: { tags: ['Auth'], summary: 'Request password reset', responses: { 200: { description: 'Email sent if exists' } } }
    },
    '/auth/reset-password': {
      post: { tags: ['Auth'], summary: 'Reset password with token', responses: { 200: { description: 'Password reset' } } }
    },
    '/history': {
      get: { tags: ['History'], summary: 'Get query history', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Paginated history' } } },
      post: { tags: ['History'], summary: 'Add history entry', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
      delete: { tags: ['History'], summary: 'Clear all history', security: [{ bearerAuth: [] }], responses: { 204: { description: 'Cleared' } } }
    },
    '/history/saved': {
      get: { tags: ['Saved Queries'], summary: 'Get saved queries', security: [{ bearerAuth: [] }], responses: { 200: { description: 'List' } } },
      post: { tags: ['Saved Queries'], summary: 'Save a query', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Saved' } } }
    },
    '/db': {
      get: { tags: ['Database'], summary: 'List connections', security: [{ bearerAuth: [] }], responses: { 200: { description: 'List' } } },
      post: { tags: ['Database'], summary: 'Add connection', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } }
    },
    '/db/execute': {
      post: { tags: ['Database'], summary: 'Execute read-only query', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Results' } } }
    },
    '/db/explain': {
      post: { tags: ['Database'], summary: 'Get query execution plan', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Explain plan' } } }
    },
    '/generate-sql': {
      post: { tags: ['AI'], summary: 'Generate SQL from natural language', responses: { 200: { description: 'SQL query' } } }
    },
    '/explain-sql': {
      post: { tags: ['AI'], summary: 'Explain SQL in plain English', responses: { 200: { description: 'Explanation' } } }
    },
    '/optimize-sql': {
      post: { tags: ['AI'], summary: 'Optimize a SQL query', responses: { 200: { description: 'Optimized SQL' } } }
    },
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { 200: { description: 'Healthy' }, 503: { description: 'Unhealthy' } } }
    }
  }
};
