// server.js
import env from './config/env.js';
import app from "./app.js";
import { startRbiTaskScheduler } from './services/rbiTaskScheduler.js';
import { connectMongoDB } from './config/mongodb.js';

// When running on Vercel serverless, export the Express app as the default handler.
// When running locally (e.g., `node backend/src/server.js`), start the HTTP server.
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  const PORT = env.PORT || 5000;
  connectMongoDB()
    .then(() => {
      startRbiTaskScheduler();
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`Environment: ${env.NODE_ENV || 'development'}`);
      });
    })
    .catch((error) => {
      console.error('Failed to start server due to MongoDB connection error:', error.message);
      process.exit(1);
    });
} else {
  connectMongoDB().catch((error) => {
    console.error('MongoDB connection initialization failed on serverless runtime:', error.message);
  });
}

export default app;
