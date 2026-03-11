import dotenv from 'dotenv';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('node:url');
  const fs = await import('fs');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../../.env');

  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('❌ Error loading .env file:', result.error);
      process.exit(1);
    }
  } else {
    console.warn('⚠️  .env file not found, using environment variables from Vercel');
  }
}

// Verify required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'GROQ_KEY', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]?.trim());

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Log environment status
console.log('\n📋 Environment Configuration:');
console.log('='.repeat(50));
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ not set'}`);
console.log(`- GEMINI_API_KEY2: ${process.env.GEMINI_API_KEY2 ? '✅ set' : '❌ not set'}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ set' : '⚠️  not set (FutureOS AI endpoints disabled)'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ set' : '❌ not set'}`);
console.log(`- GROQ_KEY: ${process.env.GROQ_KEY ? '✅ set' : '❌ not set'}`);
console.log(`- NEO4J_URI: ${process.env.NEO4J_URI ? '✅ set' : '⚠️  not set (GraphRAG disabled)'}`);
console.log(`- NEO4J_USERNAME: ${process.env.NEO4J_USERNAME || process.env.NEO4J_USER ? '✅ set' : '⚠️  not set (GraphRAG disabled)'}`);
console.log(`- NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? '✅ set' : '⚠️  not set (GraphRAG disabled)'}`);
console.log(`- NEO4J_DATABASE: ${process.env.NEO4J_DATABASE ? '✅ set' : '⚠️  using default (neo4j)'}`);
console.log('='.repeat(50) + '\n');

// Export environment variables
export default process.env;
