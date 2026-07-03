/** RFC 9457 problem details, as returned by every VaultNUBAN error response. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/** Base error for all non-2xx API responses. */
export class VaultNubanError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;
  readonly requestId?: string;

  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem.detail ?? problem.title);
    this.name = "VaultNubanError";
    this.status = problem.status;
    this.problem = problem;
    this.requestId = requestId;
  }
}

export class AuthenticationError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "ConflictError";
  }
}

export class ValidationError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "RateLimitError";
  }
}

export class ServerError extends VaultNubanError {
  constructor(problem: ProblemDetails, requestId?: string) {
    super(problem, requestId);
    this.name = "ServerError";
  }
}

/** Network failure / timeout before a response was received. */
export class ConnectionError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ConnectionError";
    this.cause = cause;
  }
}

export function errorFromResponse(
  status: number,
  problem: ProblemDetails,
  requestId?: string,
): VaultNubanError {
  switch (true) {
    case status === 401:
      return new AuthenticationError(problem, requestId);
    case status === 404:
      return new NotFoundError(problem, requestId);
    case status === 409:
      return new ConflictError(problem, requestId);
    case status === 400 || status === 422:
      return new ValidationError(problem, requestId);
    case status === 429:
      return new RateLimitError(problem, requestId);
    case status >= 500:
      return new ServerError(problem, requestId);
    default:
      return new VaultNubanError(problem, requestId);
  }
}
