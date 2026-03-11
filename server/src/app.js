// app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import geminiRouter from "./routers/geminiRouter.js";
import userRouter from "./routers/userRouter.js";
import chatRouter from "./routers/chatRouter.js";
import speechRouter from "./routers/speechRouter.js";
import { createUploadsDir } from "./utils/fileUpload.js";
import uploadRouter from "./routers/uploadRouter.js";
import youtubeRouter from "./routers/youtubeRouter.js";
import feedbackRouter from "./routers/feedbackRouter.js";
import proxyRouter from "./routers/proxyRouter.js";
import taskRouter from "./routers/taskRouter.js";
import futureOsRouter from "./routers/futureOsRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//env
const envPaths = [
  join(__dirname, '..', '.env'),
  join(__dirname, '.env'),
  join(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('Successfully loaded .env from:', envPath);
      console.log('GEMINI_API_KEY is set:', !!process.env.GEMINI_API_KEY);
      envLoaded = true;
      break;
    }
  } catch (e) {
    console.log('Error loading .env from', envPath, ':', e.message);
  }
}

if (!envLoaded) {
  console.error('Failed to load .env file from any location');
}

// Log all environment variables (excluding sensitive ones)
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***set***' : '***not set***',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***set***' : '***not set***',
  MONGODB_URI: process.env.MONGODB_URI ? '***set***' : '***not set***'
});

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Create uploads directory
createUploadsDir();

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Development (removed trailing slash)
  'http://localhost:8080', // Localhost
  'https://lunnaa.vercel.app' //Lunna
];

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 400),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));

      if (!origin || allowedOrigins.includes(origin) || (isDevelopment && isLocalhost)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.use(express.json());

// Routes
app.use("/api/gemini", geminiRouter);
app.use("/api/users", userRouter);
app.use("/api/speech", speechRouter);
app.use("/api", uploadRouter); // exposes POST /api/upload
app.use("/api/youtube", youtubeRouter); // MCP (Model Context Protocol) endpoints
app.use("/api/chat", chatRouter); // Chat endpoints
app.use("/api/feedback", feedbackRouter);
app.use("/api/proxy", proxyRouter);
app.use("/api/tasks", taskRouter);
app.use("/api", futureOsRouter);

// Health check
app.get("/", (req, res) => {
  res.send("✅ API service is running");
});

export default app;
