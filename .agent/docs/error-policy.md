# Error Policy

## External API Handling (OCR, AI)
- **Fallback**: Always assume external APIs will fail. Provide a graceful fallback (e.g., "OCR unavailable, please enter manually" or "AI Analysis failed, retry later").
- **Timeouts**: Set strict timeouts for all external calls (e.g., 10s for OCR, 30s for LLM analysis). Don't hang the UI.
- **Retry**: Implement exponential backoff for transient network errors (503, 429). Do NOT retry 400s (Bad Request).

## Logging Standards
- **Levels**:
    - `ERROR`: System failure, data loss risk, handled exception requiring attention.
    - `WARN`: Unexpected but recoverable state, deprecated usage.
    - `INFO`: Significant lifecycle events (startup, job completion).
    - `DEBUG`: Detailed flow information for development (disable in prod).
- **Sanitization**: Strip secrets and PII before logging.

## User Feedback
- **UI Messages**: Show user-friendly error messages, not raw stack traces.
    - Bad: `Error: 500 Internal Server Error at line 50...`
    - Good: "Something went wrong while saving. Please try again."
- **Toasts**: Use toast notifications for transient errors. Validations should be inline.
