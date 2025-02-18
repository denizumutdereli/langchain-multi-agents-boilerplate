import dotenv from 'dotenv';
import { z } from 'zod';

console.log('Starting configuration loading...');

// Load environment variables silently
const result = dotenv.config();

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

console.log('Environment variables loaded successfully');
console.log('Current NODE_ENV:', process.env.NODE_ENV);

// Define environment schema
console.log('Defining environment schema...');
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.string().default('3000'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string(),

  // Groq
  GROQ_API_KEY: z.string(),

  // LangChain
  LANGCHAIN_TRACING_V2: z.string().optional().default('false'),
  LANGCHAIN_VERBOSE: z.string().optional().default('false'),
  LANGCHAIN_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),
  LANGCHAIN_CALLBACKS_BACKGROUND: z.string().optional().default('true'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('warn'),
});

// Parse and validate environment variables
console.log('Validating environment variables...');
let env;
try {
  env = envSchema.parse(process.env);
  console.log('Environment validation successful');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation failed:', error.errors);
  } else {
    console.error('Unexpected error during environment validation:', error);
  }
  process.exit(1);
}

// Set LangChain environment variables
process.env.LANGCHAIN_VERBOSE = 'false';
process.env.LANGCHAIN_TRACING_V2 = 'false';
process.env.LANGCHAIN_CALLBACKS_BACKGROUND = 'true';

// Export configuration
export const config = {
  env: env.NODE_ENV,
  server: {
    port: parseInt(env.PORT, 10),
  },
  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    password: env.REDIS_PASSWORD,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  groq: {
    apiKey: env.GROQ_API_KEY,
  },
  langchain: {
    tracingV2: false,
    verbose: false,
    apiKey: env.LANGCHAIN_API_KEY,
    project: env.LANGCHAIN_PROJECT,
    callbacksBackground: true,
  },
  models: {
    maxTokens: 500,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

console.log('Configuration loaded successfully'); 