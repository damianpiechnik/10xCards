export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid API key") {
    super(message, "AUTH_ERROR", 401);
    this.name = "OpenRouterAuthError";
    Object.setPrototypeOf(this, OpenRouterAuthError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "OpenRouterRateLimitError";
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "OpenRouterValidationError";
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}

export class OpenRouterParseError extends OpenRouterError {
  constructor(
    message: string,
    public readonly rawContent?: string
  ) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
    Object.setPrototypeOf(this, OpenRouterParseError.prototype);
  }
}

export class OpenRouterServerError extends OpenRouterError {
  constructor(message = "Server error", statusCode = 500) {
    super(message, "SERVER_ERROR", statusCode);
    this.name = "OpenRouterServerError";
    Object.setPrototypeOf(this, OpenRouterServerError.prototype);
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = "Request timeout") {
    super(message, "TIMEOUT_ERROR");
    this.name = "OpenRouterTimeoutError";
    Object.setPrototypeOf(this, OpenRouterTimeoutError.prototype);
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message = "Network error") {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
    Object.setPrototypeOf(this, OpenRouterNetworkError.prototype);
  }
}
