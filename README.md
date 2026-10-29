# Auth Layer

Nuxt layer providing magic link authentication with better-auth.

## Setup

### Install layer and dependencies

```ts
export default defineNuxtConfig({
  extends: ['github:awecode/nuxt-better-auth-layer'],
})
```

```bash
pnpm install better-auth aws4fetch
```

`server/utils/auth.ts` imports from the app root with Nuxt's `~~` alias (`~~/server/utils/db`), so the same layer works from GitHub and from a local `layers/auth` folder.

To vendor a copy you can edit in place:

```bash
pnpx giget gh:awecode/nuxt-better-auth-layer layers/auth
```

Nuxt registers `layers/*` on its own.

### Configure better-auth

The layer provides a default configuration for better-auth in `server/utils/auth.config.ts`. Edit that file in a local `layers/auth` copy when you need to change it. Client configuration is in `composables/auth.client.config.ts`.

The default configuration uses the drizzle adapter. The app's `server/utils/db.ts` must export:

- `useDb(event)`: the request's drizzle client.
- `createDbClient({ url })`: a new client, used by the better-auth CLI outside Nuxt.
- `Db`: the client type.

`useServerAuth(event)` builds one better-auth instance per request on `useDb(event)` and caches it on `event.context.betterAuth`. `createAuthConfig(db)` receives that database and never calls `useDb()` itself.

## Migrate database

Install the better-auth CLI (the `auth` package) as a dev dependency, so its version stays pinned next to `better-auth`:

```bash
pnpm add -D auth
```

Add the scripts (`db:*` match the `nuxt-database` skill):

```json
{
  "scripts": {
    "auth:generate": "auth generate --config layers/auth/server/utils/auth.ts --output layers/auth/server/schema.ts --yes && eslint --fix layers/auth/server/schema.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Point `--config` at this layer's `server/utils/auth.ts` (`layers/auth/...` for a local copy, or the downloaded layer under `node_modules/.c12` for a GitHub extend). The CLI loads `.env` and needs `NUXT_DATABASE_URL`, plus `BETTER_AUTH_URL` or `NUXT_PUBLIC_BASE_URL`.

Re-export the generated tables from `server/db/schema.ts`:

```ts
export * from '../../layers/auth/server/schema'
```

Then generate and apply the migration:

```bash
pnpm auth:generate  # writes the better-auth tables to layers/auth/server/schema.ts
pnpm db:generate    # drizzle-kit compares the schema with past migrations and writes a new SQL migration
pnpm db:migrate     # applies pending migrations to NUXT_DATABASE_URL
```

On D1, use the skill's `db:migrate:d1:local` (`wrangler d1 migrations apply DB --local`) or `db:migrate:d1` (`--remote`) instead of `db:migrate`.

### Using with Tailwind

Tailwind components are provided with the layer. To use them, [install Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nuxt).
Import the layer source file from your `app/assets/css/main.css` so Tailwind scans the layer wherever Nuxt installed it:

```css
@import "tailwindcss";
@import "#layers/auth/app/assets/css/source.css";
```

### Configure environment variables

```bash
# SES Configuration (required for production for sending emails)
NUXT_SES_REGION=us-east-1
NUXT_SES_ACCESS_KEY_ID=your_access_key_id
NUXT_SES_SECRET_KEY=your_secret_key
NUXT_SES_FROM_EMAIL=noreply@example.com

# Who can log in (required: nobody can log in until one is set, see below)
NUXT_AUTH_ALLOWED_DOMAINS=example.com,company.org
NUXT_AUTH_ALLOWED_EMAILS=admin@example.com,user@company.org
# Or allow everyone
# NUXT_AUTH_ALLOWED_EMAILS=*
NUXT_AUTH_ADMIN_EMAILS=admin@example.com,superuser@company.org

# API route protection (optional - see below)
NUXT_AUTH_AUTHENTICATED_ONLY_API_ROUTES=/api/user,/api/profile
NUXT_AUTH_ADMIN_ONLY_API_ROUTES=/api/admin,/api/management

# Auth redirects (optional - defaults provided)
NUXT_PUBLIC_AUTH_REDIRECT_USER_TO=/
NUXT_PUBLIC_AUTH_REDIRECT_NEW_USER_TO=/welcome
NUXT_PUBLIC_AUTH_REDIRECT_ERROR_TO=/auth/error
NUXT_PUBLIC_AUTH_REDIRECT_GUEST_TO=/login
NUXT_PUBLIC_AUTH_AUTH_REQUIRED_BY_DEFAULT=true
```

## `useAuth` Composable

```ts
const { 
  client,          // Better-auth client
  session,         // Current session (reactive)
  user,           // Current user (reactive)
  loggedIn,       // Boolean computed from session
  signIn,         // Sign-in methods
  signOut,        // Sign out function
  fetchSession,   // Manually refetch session
  options         // Runtime config options
} = useAuth()
```

## Components

### MagicLinkLogin
Email-based authentication component. Sends both a clickable link and a one-time token that users can enter manually.

```vue
<template>
  <MagicLinkLogin />
</template>
```

## Page Protection

### Require Authentication
```ts
definePageMeta({
  auth: true
})
```

### Guest Only (redirect authenticated users)
```ts
definePageMeta({
  auth: { only: 'guest' }
})
```

### Custom Redirects
```ts
definePageMeta({
  auth: {
    redirectUserTo: '/dashboard',
    redirectGuestTo: '/signup'
  }
})
```

### Disable Auth (public page)
```ts
definePageMeta({
  auth: false
})
```

## Session Utilities

Server-side utilities for working with authentication sessions and users:

```ts
// Get session (returns null if not authenticated)
const session = await getAuthSession(event)

// Get user (returns undefined if not authenticated)
const user = await getUser(event)

// Throw error if not authenticated (401)
await requireAuthenticated(event)

// Throw error if not authenticated or not admin (401/403)
await requireAdmin(event)
```

### `getAuthSession(event)`
Retrieves the current session from the event context. If not already cached, fetches it from the auth API and forwards any refreshed session cookies to the response.

### `getUser(event)`
Convenience function that returns the user from the session, or `undefined` if not authenticated.

### `requireAuthenticated(event)`
Throws a 401 Unauthorized error if the user is not authenticated. Use this for manual session validation.

### `requireAdmin(event)`
Throws a 401 Unauthorized error if not authenticated, or 403 Forbidden if the user doesn't have admin role.

## API Route Protection

### Route Protection via Nuxt Config

You can protect multiple API routes at once using nuxt config or environment variables. This applies protection automatically via middleware without needing to specify in each event handler.

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    auth: {
        authenticatedOnlyApiRoutes: '/api/user,/api/profile',
        adminOnlyApiRoutes: '/api/admin,/api/superadmin',
      },
  },
})
```

 - You can also use the `NUXT_AUTH_AUTHENTICATED_ONLY_API_ROUTES` and `NUXT_AUTH_ADMIN_ONLY_API_ROUTES` environment variables to set the routes.
 - Protecting `/api/user` will also protect `/api/user` and anything under it like `/api/user/profile` and `/api/user/settings` but won't protect something like `/api/user-registration`.

### Individual Route Protection

#### Allowing only authenticated users

Using handler wrapper:
```ts
// server/api/authenticated.ts
export default defineAuthenticatedHandler(async (event) => {
  const { user } = event.context.auth
  return { message: `Hello user - ${user.email}` }
})
```

Or using manual validation:
```ts
// server/api/authenticated.ts
export default defineEventHandler(async (event) => {
  await requireAuthenticated(event)
  const user = await getUser(event)
  return { message: `Hello user - ${user.email}` }
})
```

#### Allowing only admin users

Using handler wrapper:
```ts
// server/api/admin.ts
export default defineAdminHandler(async (event) => {
  const { user } = event.context.auth
  return { message: `Hello admin - ${user.email}` }
})
```

Or using manual validation:
```ts
// server/api/admin.ts
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const user = await getUser(event)
  return { message: `Hello admin - ${user.email}` }
})
```

## API Endpoints

- `POST /api/auth/magic-link-send` - Send magic link email
  ```ts
  { email: 'user@example.com' }
  ```

- `POST /api/auth/magic-link-verify` - Verify one-time token
  ```ts
  { token: 'ABC123' }
  ```

## Bearer Token Authentication

For web applications, use the default cookie-based authentication. Bearer tokens are needed for mobile apps or other clients that can't use cookies. The layer's `customSession` plugin omits `session.token` from `GET /api/auth/get-session` and from `fetchSession()` return values, so browser code should not rely on the session JSON for a bearer secret. Mobile clients should read the token from the login response (Better Auth bearer plugin `set-auth-token` header) and store it securely.

```bash
# Example API call with Bearer token
curl -X POST https://yourapp.com/api/protected \
  -H "Authorization: Bearer t0k3ng035h3r3..." \
  -H "Content-Type: application/json" \
  -d '{"data": "example"}'
```

## Access Restrictions by Email Address or Domain

The layer always checks who can log in, using two environment variables. Nobody can log in until at least one is set, so each app chooses explicitly.

```bash
# Allow everyone
NUXT_AUTH_ALLOWED_EMAILS=*

# Allow only users with @example.com or @company.org emails
NUXT_AUTH_ALLOWED_DOMAINS=example.com,company.org

# Allow only these addresses
NUXT_AUTH_ALLOWED_EMAILS=admin@example.com,user@company.org
```

When both are set, an email that matches either list is allowed: `NUXT_AUTH_ALLOWED_DOMAINS=company.com` with `NUXT_AUTH_ALLOWED_EMAILS=contractor@gmail.com` lets in everyone at company.com plus that one contractor. `*` in either variable allows everyone.

The checks are wired in `server/utils/auth.config.ts`:

- A request hook (`allowListedSignup`) rejects magic-link requests for a disallowed address before any email is sent.
- Database hooks (`allowListedEmail`) run for every sign-in method, Google and other OAuth providers included. The user hook stops disallowed sign-ups. The session hook stops existing users whose email was removed from the lists. Sessions that already exist stay valid until they expire or are revoked.
- A rejected OAuth login redirects to `redirectErrorTo` with `?error=NOT_AUTHORIZED` instead of showing a JSON error.

### Admin Role Assignment
Automatically assign admin role to specific email addresses during user creation. Uncomment the `setAdminForEmail` line in the user create hook in `server/utils/auth.config.ts` to enable it:

```bash
# Automatically set admin role for these email addresses
NUXT_AUTH_ADMIN_EMAILS=admin@example.com,superuser@company.org
```


## Email Templates

The default magic link email template is `server/assets/magic-link.html` in this layer. To override it, add `server/assets/magic-link.html` in the host app.

Available template variables:
- `{{email}}` - User's email
- `{{token}}` - One-time token
- `{{url}}` - Magic link URL
- `{{date}}` - Current date
- `{{time}}` - Current time (UTC)
- `{{useragent}}` - Short Browser/OS info like `Firefox, Linux`

## Credits

- [Better Auth](https://github.com/better-auth/better-auth)
- [Sébastien's NuxtHub Better Auth Demo for composable, middleware, and plugins](https://github.com/atinux/nuxthub-better-auth)