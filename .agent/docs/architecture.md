# Architecture & Design Philosophy

## Tech Stack Decisions

### Next.js App Router
- **Why**: Standard for modern React applications, providing built-in routing, server-side rendering (SSR), and simplified data fetching.
- **Usage**: Use for all UI components and page layouts. Leverage Server Components for data fetching to reduce client-side JavaScript.

### Supabase
- **Why**: Provides a complete backend-as-a-service (BaaS) with PostgreSQL, Auth, and Storage. drastic reduction in backend boilerplate.
- **Usage**:
    - **Database**: PostgreSQL for all structured data.
    - **Auth**: Supabase Auth for user management.
    - **Storage**: Blob storage for receipts and documents.
    - **Realtime**: (If needed) for live updates.

## Responsibility Separation

### Server (Back-end / Database)
- **Primary Source of Truth**: Data validation, business logic enforcement (via RLS and Database constraints), and money calculations MUST happen here.
- **Security**: Row Level Security (RLS) is the primary defense. Never trust the client.

### Client (Front-end)
- **UI/UX**: Rendering, user interaction, optimistic updates for responsiveness.
- **Validation**: Form validation for better UX, but NOT for security.

## API Design
- **Preference**: Use Supabase Client directly for standard CRUD operations where RLS is sufficient.
- **Server Actions**: Use Next.js Server Actions for complex mutations or when bypassing RLS is strictly necessary (and guarded).
- **RPC**: Use Supabase RPC (Postgres functions) for complex database-side logic (e.g., aggregate calculations).

## Caching Strategy
- **Fetch**: Leverage standard Next.js `fetch` caching defaults where appropriate. Revalidate paths on mutations.
- **Dynamic Data**: Mark transactional data components as dynamic to ensure freshness.

## Authorization
- **RLS (Row Level Security)**: MANDATORY for all tables.
- **Policy**: "Deny by default". explicitly allow access based on user ID.
