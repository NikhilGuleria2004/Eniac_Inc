export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public fields?: Record<string, string[]>;

  constructor(message = "Request validation failed.", fields?: Record<string, string[]>) {
    super(message, 400, "VALIDATION_ERROR");
    this.fields = fields;
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Invalid credentials.") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Access denied.") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource was not found.") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict.") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class BusinessRuleError extends AppError {
  constructor(message = "Business rule violation.", code = "BUSINESS_RULE_ERROR") {
    super(message, 422, code);
    this.name = "BusinessRuleError";
  }
}
