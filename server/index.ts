import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { setupAuth } from "./auth";

const app = express();
const server = createServer(app);

// Standard port configuration for Express backend
const PORT = 5173;
const HOST = '0.0.0.0';

async function main() {
  try {
    console.log("Starting server initialization...");

    // Basic middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup authentication before routes
    console.log("Setting up authentication...");
    setupAuth(app);

    // Register API routes first, before any static/Vite middleware
    console.log("Registering API routes...");
    registerRoutes(app);

    // Then set up Vite or static serving
    console.log("Setting up frontend serving...");
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    // Error handling middleware must be after all other middleware and routes
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    server.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
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