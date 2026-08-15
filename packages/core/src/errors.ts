/**
 * Domain-specific error taxonomy (ARCHITECTURE.md §62).
 * Infrastructure and provider packages should throw/normalize into these
 * categories instead of leaking raw driver/HTTP errors into the application layer.
 */
export abstract class GoFluentError extends Error {
  abstract readonly category: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class ConfigurationError extends GoFluentError {
  readonly category = "ConfigurationError";
}

export class DatabaseError extends GoFluentError {
  readonly category = "DatabaseError";
}

export class AIProviderError extends GoFluentError {
  readonly category = "AIProviderError";
}

export class SpeechProviderError extends GoFluentError {
  readonly category = "SpeechProviderError";
}

export class ValidationError extends GoFluentError {
  readonly category = "ValidationError";
}

export class LearningStateError extends GoFluentError {
  readonly category = "LearningStateError";
}

export class ContentGenerationError extends GoFluentError {
  readonly category = "ContentGenerationError";
}

export class NetworkError extends GoFluentError {
  readonly category = "NetworkError";
}
