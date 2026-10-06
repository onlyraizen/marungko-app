import type { ErrorRequestHandler, RequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Route not found." } });
};

/** Last-resort handler. Same { error: { code, message } } envelope as requireAuth. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // Malformed JSON bodies surface from express.json() with a 400 status.
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 413) {
    res.status(status).json({ error: { code: "bad_request", message: "Invalid request body." } });
    return;
  }

  console.error("[error] unhandled:", error instanceof Error ? error.stack : error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: env.IS_PRODUCTION ? "Something went wrong." : String(error),
    },
  });
};
