/**
 * Generic validation middleware factory: `validate(schema)` attached to
 * a route, not duplicated `if` checks inside every controller. By the
 * time a controller runs, it can trust the validated, coerced data is
 * sitting in `req.body` (or query, for GET endpoints) — and TypeScript
 * knows its real type, because we overwrite the field with the
 * schema's *parsed* output, not the raw input.
 */
import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { badRequest } from "../lib/http-error";

type Target = "body" | "query";

function firstIssueMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "invalid request";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

export function validate(schema: ZodType, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(badRequest(firstIssueMessage(result.error)));
      return;
    }

    // Replacing rather than merging: the parsed value is the complete,
    // coerced, defaulted shape (e.g. `limit` defaulted to 10) — the raw
    // input should not leak through alongside it.
    //
    // `req.query` specifically can't be assigned with `=` on Express 5:
    // it's defined on the request prototype as a getter-only accessor
    // (lazily parsed on first read), so a plain assignment throws
    // "Cannot set property query of #<IncomingMessage> which has only a
    // getter." `Object.defineProperty` creates a new OWN property on
    // this request instance that shadows the prototype's getter, which
    // is the supported way to override it. `req.body` has no such
    // accessor (body-parser assigns it as a plain own property), so the
    // direct assignment still works fine for that target.
    if (target === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[target] = result.data;
    }
    next();
  };
}
