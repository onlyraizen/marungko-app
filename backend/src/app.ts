import cors from "cors";
import express, { type Express } from "express";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Railway terminates TLS at its proxy; trust one hop so req.ip is the client's.
  app.set("trust proxy", 1);

  app.use(cors({ origin: env.CORS_ORIGINS, methods: ["GET", "POST"] }));
  app.use(express.json({ limit: "100kb" }));

  app.use(healthRouter);
  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);

  // Request-validation failures become a clean 400 instead of a 500.
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { code: "validation_failed", message: "Request validation failed." },
      });
      return;
    }
    next(error);
  });
  app.use(errorHandler);

  return app;
}
