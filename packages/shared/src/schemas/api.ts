import { z } from "zod";

/**
 * Error envelope returned by every backend route, e.g. from requireAuth:
 * { "error": { "code": "token_expired", "message": "..." } }
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;