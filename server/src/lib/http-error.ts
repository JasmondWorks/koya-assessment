/**
 * `HttpError` is our one typed "operational error" — a failure we expect
 * can happen (bad input, missing resource, conflict) and know exactly how
 * to turn into an HTTP response. It's thrown from services/controllers and
 * caught in one place: the error-handling middleware (see
 * middleware/error-handler.ts).
 *
 * The distinction that matters: operational errors (typed, expected,
 * safe to describe to the client) vs. programmer errors (bugs —
 * anything that isn't an `HttpError` is treated as one and gets a
 * generic 500, never leaking internals).
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  /** Extra response headers this error needs to carry, e.g. Retry-After. */
  public readonly headers: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.headers = headers;

    // Restores the correct prototype chain when compiled down by older
    // TS/JS targets — without this, `error instanceof HttpError` can
    // silently return false after transpilation.
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const unprocessable = (message: string) => new HttpError(422, message);
export const tooManyRequests = (message: string, retryAfterSeconds: number) =>
  new HttpError(429, message, {
    "Retry-After": String(retryAfterSeconds),
  });
export const unauthorized = (message: string) => new HttpError(401, message);
