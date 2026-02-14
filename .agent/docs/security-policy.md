# Security Policy

## Core Principles
1.  **Server-Side Authority**: Never trust input from the client. All authorizations must be verified on the server (or Database via RLS).
2.  **Least Privilege**: Users and API keys should only have the permissions strictly necessary.

## Authentication & Authorization
- **Supabase Auth**: Use for all identity management.
- **RLS (Row Level Security)**: MUST be enabled on ALL tables.
    - Policies must explicitly check `auth.uid()`.
    - No `public` access unless strictly intended (e.g., login page assets).
- **Service Keys**: `SERVICE_ROLE_KEY` is for backend admin tasks ONLY. Never expose to client.

## Data Protection
- **PII (Personally Identifiable Information)**: Do not log PII (email, phone, address, raw OCR text containing names) in application logs.
- **Secrets**: API Keys (e.g., OpenAI, Google Cloud) must be stored in environment variables on the server. NEVER in client bundles.

## Data Integrity
- **Deletes**: Financial records should generally use "Soft Delete" (archive flag) rather than physical deletion to maintain audit trails, unless a "Hard Delete" is explicitly requested for privacy compliance (GDPR/CCPA - if applicable).

## Auditing
- **Critical Actions**: Log critical mutations (creation/deletion of transactions) with `user_id` and timestamp.
