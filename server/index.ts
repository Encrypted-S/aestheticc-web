import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";

const app = express();
const server = createServer(app);

// Use the PORT provided by the environment, default to 3000 if not specified
const PORT = parseInt(process.env.PORT || '5173', 10);

async function main() {
  try {
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    registerRoutes(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EACCES') {
        console.error(`Port ${PORT} requires elevated privileges`);
      } else if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});