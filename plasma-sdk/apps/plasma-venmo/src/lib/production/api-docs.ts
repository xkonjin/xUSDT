/**
 * API Documentation Utilities
 * Simple API documentation without external dependencies
 */

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Parameter location
 */
export type ParamLocation = 'path' | 'query' | 'header' | 'body';

/**
 * API parameter definition
 */
export interface ApiParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  location: ParamLocation;
  example?: unknown;
}

/**
 * API response definition
 */
export interface ApiResponse {
  status: number;
  description: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  tags: string[];
  parameters: ApiParam[];
  responses: ApiResponse[];
  requiresAuth: boolean;
}

/**
 * API documentation registry
 */
class ApiDocRegistry {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  
  /**
   * Register an API endpoint
   */
  register(endpoint: ApiEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }
  
  /**
   * Get all registered endpoints
   */
  getAll(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }
  
  /**
   * Get endpoints by tag
   */
  getByTag(tag: string): ApiEndpoint[] {
    return this.getAll().filter(e => e.tags.includes(tag));
  }
  
  /**
   * Generate OpenAPI-compatible JSON
   */
  toOpenApi(): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};
    
    for (const endpoint of this.getAll()) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      
      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        security: endpoint.requiresAuth ? [{ bearerAuth: [] }] : [],
        parameters: endpoint.parameters
          .filter(p => p.location !== 'body')
          .map(p => ({
            name: p.name,
            in: p.location,
            required: p.required,
            description: p.description,
            schema: { type: p.type },
            example: p.example
          })),
        requestBody: endpoint.parameters.some(p => p.location === 'body')
          ? {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: Object.fromEntries(
                      endpoint.parameters
                        .filter(p => p.location === 'body')
                        .map(p => [p.name, { type: p.type, description: p.description }])
                    )
                  }
                }
              }
            }
          : undefined,
        responses: Object.fromEntries(
          endpoint.responses.map(r => [
            r.status.toString(),
            {
              description: r.description,
              content: r.schema
                ? { 'application/json': { schema: r.schema, example: r.example } }
                : undefined
            }
          ])
        )
      };
    }
    
    return {
      openapi: '3.0.3',
      info: {
        title: 'xUSDT/Plenmo API',
        version: '1.0.0',
        description: 'Payment and transfer API for Plenmo'
      },
      servers: [
        { url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }
}

/**
 * Global API documentation registry
 */
export const apiDocs = new ApiDocRegistry();

/**
 * Decorator-style function to document an endpoint
 */
export function documentEndpoint(endpoint: ApiEndpoint): void {
  apiDocs.register(endpoint);
}

/**
 * Pre-registered common endpoints
 */
documentEndpoint({
  path: '/api/health',
  method: 'GET',
  summary: 'Health check',
  description: 'Returns the health status of the API',
  tags: ['System'],
  parameters: [],
  responses: [
    { status: 200, description: 'Service is healthy' },
    { status: 503, description: 'Service is unhealthy' }
  ],
  requiresAuth: false
});

documentEndpoint({
  path: '/api/payments/initiate',
  method: 'POST',
  summary: 'Initiate a new payment',
  description: 'Creates and processes a new payment transaction. Requires user authentication.',
  tags: ['Payments'],
  parameters: [
    { name: 'amount', type: 'number', required: true, location: 'body', description: 'The payment amount', example: 100.50 },
    { name: 'currency', type: 'string', required: true, location: 'body', description: 'The currency of the payment', example: 'xUSDT' },
    { name: 'recipient', type: 'string', required: true, location: 'body', description: 'The recipient wallet address' },
    { name: 'metadata', type: 'object', required: false, location: 'body', description: 'Additional payment metadata' }
  ],
  responses: [
    { status: 201, description: 'Payment initiated successfully' },
    { status: 400, description: 'Bad Request - Invalid input parameters' },
    { status: 401, description: 'Unauthorized - Missing or invalid authentication token' },
    { status: 500, description: 'Internal Server Error' }
  ],
  requiresAuth: true
});

documentEndpoint({
  path: '/api/payments/{id}/status',
  method: 'GET',
  summary: 'Get payment status',
  description: 'Retrieves the current status of a specific payment by its ID.',
  tags: ['Payments'],
  parameters: [
    { name: 'id', type: 'string', required: true, location: 'path', description: 'The unique identifier of the payment' }
  ],
  responses: [
    { status: 200, description: 'Payment status retrieved successfully' },
    { status: 404, description: 'Not Found - Payment with the specified ID not found' },
    { status: 500, description: 'Internal Server Error' }
  ],
  requiresAuth: false
});

documentEndpoint({
  path: '/api/payments/webhook',
  method: 'POST',
  summary: 'Payment webhook endpoint',
  description: 'Handles incoming webhooks from a third-party payment processor to update payment statuses.',
  tags: ['Webhooks'],
  parameters: [
    { name: 'eventId', type: 'string', required: true, location: 'body', description: 'Webhook event ID' },
    { name: 'paymentId', type: 'string', required: true, location: 'body', description: 'Payment ID' },
    { name: 'status', type: 'string', required: true, location: 'body', description: 'Payment status' }
  ],
  responses: [
    { status: 200, description: 'Webhook received and processed successfully' },
    { status: 400, description: 'Bad Request - Invalid webhook payload' },
    { status: 403, description: 'Forbidden - Invalid webhook signature' }
  ],
  requiresAuth: false
});

documentEndpoint({
  path: '/api/balance',
  method: 'GET',
  summary: 'Get balance',
  description: 'Get the USDC balance for a wallet',
  tags: ['Payments'],
  parameters: [
    { name: 'address', type: 'string', required: true, location: 'query', description: 'Wallet address' }
  ],
  responses: [
    { status: 200, description: 'Balance retrieved successfully' },
    { status: 400, description: 'Invalid address' }
  ],
  requiresAuth: false
});

/**
 * Export OpenAPI spec as default
 */
const swaggerSpec = apiDocs.toOpenApi();
export default swaggerSpec;
