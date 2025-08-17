const express = require('express');
const swaggerUi = require('swagger-ui-express');
const app = express();
const port = 3000;

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API de Gerenciamento de Pedidos',
    description: 'API RESTful para gerenciamento de pedidos com integração Kafka e Elasticsearch',
    version: '1.0.0',
  },
  tags: [
    {
      name: 'pedidos',
      description: 'Operações relacionadas a pedidos',
    },
    {
      name: 'system',
      description: 'Endpoints do sistema',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['system'],
        summary: 'Verificar se a API está funcionando',
        responses: {
          '200': {
            description: 'API funcionando',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: 'API is working!',
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['system'],
        summary: 'Verificar a saúde da API',
        responses: {
          '200': {
            description: 'API está saudável',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-05-12T00:00:00.000Z',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['pedidos'],
        summary: 'Listar todos os pedidos',
        responses: {
          '200': {
            description: 'Lista de pedidos retornada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '123e4567-e89b-12d3-a456-426614174000',
                      },
                      customerName: {
                        type: 'string',
                        example: 'João Silva',
                      },
                      status: {
                        type: 'string',
                        example: 'pending',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['pedidos'],
        summary: 'Criar um novo pedido',
        responses: {
          '201': {
            description: 'Pedido criado com sucesso',
          },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['pedidos'],
        summary: 'Buscar um pedido pelo ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID do pedido',
          },
        ],
        responses: {
          '200': {
            description: 'Pedido encontrado',
          },
          '404': {
            description: 'Pedido não encontrado',
          },
        },
      },
    },
  },
};

app.get('/', (req, res) => {
  res.send('API is working!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/orders', (req, res) => {
  res.json([
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'João Silva',
      customerEmail: 'joao.silva@exemplo.com',
      status: 'pending',
      totalAmount: 999.99,
      createdAt: new Date().toISOString(),
    },
  ]);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
  console.log(`Swagger UI available at http://0.0.0.0:${port}/api-docs`);
});