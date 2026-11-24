export type ExtractionErrorCode =
  | "invalid_url"
  | "blocked_target"
  | "navigation_failed"
  | "upstream_status"
  | "timeout"
  | "busy"
  | "browser_unavailable";

const HTTP_STATUS: Record<ExtractionErrorCode, number> = {
  invalid_url: 400,
  blocked_target: 403,
  navigation_failed: 502,
  upstream_status: 502,
  timeout: 504,
  busy: 429,
  browser_unavailable: 503,
};

export class ExtractionError extends Error {
  readonly code: ExtractionErrorCode;

  constructor(code: ExtractionErrorCode, message: string) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }
}
