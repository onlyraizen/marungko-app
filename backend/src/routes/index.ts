import { Router } from "express";
import { speechRouter } from "./speech.routes.js";

export const apiRouter = Router();

apiRouter.use(speechRouter);
