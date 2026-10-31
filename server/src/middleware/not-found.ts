/**
 * Catch-all for any request that didn't match a route. Registered after
 * every real route but before the error handler, so unmatched paths get
 * the same `{ error }` shape as every other failure instead of Express's
 * default HTML 404 page.
 */
import type { NextFunction, Request, Response } from "express";
import { notFound } from "../lib/http-error";

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(notFound(`no route for ${req.method} ${req.path}`));
}
