/**
 * Swagger/OpenAPI Configuration
 *
 * This file defines the API documentation structure using OpenAPI 3.0 specification.
 * Access the docs at: http://localhost:3001/api-docs
 */

import { swaggerSchemas, swaggerResponses } from "./swagger-schemas";

export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "The Copy API",
    version: "1.0.0",
    description: `
# The Copy API Documentation

The Copy is a comprehensive platform for Arabic drama script analysis and cinematography planning.

## Features

- **AI-Powered Analysis**: Seven-station pipeline for comprehensive script analysis
- **Authentication**: JWT-based secure authentication
- **Directors Studio**: Project and scene management for filmmakers
- **Cinematography Tools**: Shot planning and visual storytelling

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

Get a token by calling the \`/api/auth/login\` endpoint.

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **AI Analysis**: 20 requests per hour

## Support

For issues or questions, visit: https://github.com/mohamedaminradyofficial/the-copy
    `,
    contact: {
      name: "The Copy Team",
      url: "https://github.com/mohamedaminradyofficial/the-copy",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Development server",
    },
    {
      url: "https://api.the-copy.com",
      description: "Production server (when deployed)",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check and system status endpoints",
    },
    {
      name: "Authentication",
      description: "User authentication and authorization",
    },
    {
      name: "Analysis",
      description: "AI-powered script analysis endpoints",
    },
    {
      name: "Projects",
      description: "Project management for Directors Studio",
    },
    {
      name: "Scenes",
      description: "Scene management and breakdown",
    },
    {
      name: "Characters",
      description: "Character tracking and continuity",
    },
    {
      name: "Shots",
      description: "Cinematography shot planning",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token in the format: Bearer {token}",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token",
        description: "JWT token stored in cookie",
      },
    },
    schemas: swaggerSchemas,
    responses: swaggerResponses,
  },
  security: [
    {
      bearerAuth: [],
    },
    {
      cookieAuth: [],
    },
  ],
};

export const swaggerOptions = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/server.ts"],
};
