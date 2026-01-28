import swaggerJsdoc from 'swagger-jsdoc';

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: A human-readable error message.
 *         code:
 *           type: string
 *           description: A machine-readable error code.
 * 
 *     PaymentInitiationRequest:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *         - recipient
 *       properties:
 *         amount:
 *           type: number
 *           description: The payment amount.
 *           example: 100.50
 *         currency:
 *           type: string
 *           description: The currency of the payment.
 *           example: "xUSDT"
 *         recipient:
 *           type: string
 *           description: The recipient's wallet address.
 *         metadata:
 *           type: object
 *           description: Additional payment metadata.
 *
 *     PaymentInitiationResponse:
 *       type: object
 *       properties:
 *         paymentId:
 *           type: string
 *           description: The unique ID for the initiated payment.
 *         status:
 *           type: string
 *           description: The initial status of the payment.
 *           example: "pending"
 *
 *     PaymentStatusResponse:
 *       type: object
 *       properties:
 *         paymentId:
 *           type: string
 *           description: The payment ID.
 *         status:
 *           type: string
 *           description: The current status of the payment.
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: The timestamp of the last status update.
 *
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: "Privy-based JWT for authentication. The token should be included in the Authorization header as Bearer token."
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'xUSDT/Plenmo Payment App API',
      version: '1.0.0',
      description: 'API documentation for the xUSDT/Plenmo payment application, covering payment initiation, status checks, and webhooks.',
    },
    servers: [
      {
        url: '/api',
        description: 'Local development server',
      },
    ],
  },
  apis: ['./src/pages/api/**/*.ts', './api-docs.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a new payment
 *     description: Creates and processes a new payment transaction. Requires user authentication.
 *     tags:
 *       - Payments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiationRequest'
 *     responses:
 *       '201':
 *         description: Payment initiated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentInitiationResponse'
 *       '400':
 *         description: Bad Request - Invalid input parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized - Missing or invalid authentication token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /payments/{id}/status:
 *   get:
 *     summary: Get payment status
 *     description: Retrieves the current status of a specific payment by its ID.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the payment.
 *     responses:
 *       '200':
 *         description: Payment status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentStatusResponse'
 *       '404':
 *         description: Not Found - Payment with the specified ID not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Payment webhook endpoint
 *     description: Handles incoming webhooks from a third-party payment processor to update payment statuses.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       description: Webhook payload from the payment provider.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Webhook received and processed successfully.
 *       '400':
 *         description: Bad Request - Invalid webhook payload.
 *       '403':
 *         description: Forbidden - Invalid webhook signature.
 */

export default swaggerSpec;
