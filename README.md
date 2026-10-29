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

The layer provides a default configuration for better-auth in `server/utils/auth.config.ts`. To change it, add `server/auth.options.ts` to the app (see [Customize better-auth](#customize-better-auth)) instead of editing the layer. Client configuration is in `composables/auth.client.config.ts`.

The default configuration uses the drizzle adapter with Postgres. For SQLite or D1, set `NUXT_AUTH_DB_PROVIDER=sqlite` in `.env` (`mysql` also works). Use the env var rather than `runtimeConfig`, because the better-auth CLI reads `.env` but not `nuxt.config.ts`. The app's `server/utils/db.ts` must export:

- `useDb(event)`: the request's drizzle client.
- `createDbClient({ url })`: a new client, used by the better-auth CLI outside Nuxt.
- `Db`: the client type.

`useServerAuth(event)` builds one better-auth instance per request on `useDb(event)` and caches it on `event.context.betterAuth`. `createAuthConfig(db)` receives that database and never calls `useDb()` itself.

### Customize better-auth

Add `server/auth.options.ts` to the app and export better-auth options. The layer merges them into its configuration:

```ts
import type { BetterAuthOptions } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { genericOAuth } from 'better-auth/plugins/generic-oauth'

export default {
  rateLimit: { enabled: true, window: 60, max: 100 },
  plugins: [genericOAuth({ config: [/* providers */] })],
  hooks: {
    // Runs before the layer's allowlist check.
    before: createAuthMiddleware(async (ctx) => {
      if (typeof ctx.body?.email === 'string')
        ctx.body.email = ctx.body.email.trim().toLowerCase()
    }),
  },
  databaseHooks: {
    user: {
      create: {
        // Runs after the layer's allowlist and admin-role hook.
        before: async user => ({ data: { ...user, role: user.role === 'admin' ? 'admin' : 'staff' } }),
      },
    },
  },
} satisfies BetterAuthOptions
```

- `plugins` are added after the layer's, before `customSession` (which stays last). Their API methods are typed on `useServerAuth(event).api`. Use `satisfies BetterAuthOptions`, not a `: BetterAuthOptions` annotation, which drops those types.
- `socialProviders` are added to Google from env.
- `hooks` and `databaseHooks` run alongside the layer's own. Your request hook runs before the allowlist, so it can normalize input. Your database hooks run after the allowlist and admin-role hooks: a disallowed user never reaches them, and `role` is already `admin` for `NUXT_AUTH_ADMIN_EMAILS`.
- Any other option replaces the layer's default.

The layer finds the file through the `#auth-options` alias. Restart the dev server after creating it.

## Migrate database

Install the better-auth CLI (the `auth` package) as a dev dependency, so its version stays pinned next to `better-auth`:

```bash
pnpm add -D auth
```

Add the scripts (`db:*` match the `nuxt-database` skill):

```json
{
  "scripts": {
    "auth:generate": "auth generate --config layers/auth/server/utils/auth.ts --output server/db/auth-schema.ts --yes && eslint --fix server/db/auth-schema.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Point `--config` at this layer's `server/utils/auth.ts` (`layers/auth/...` for a local copy, or the downloaded layer under `node_modules/.c12` for a GitHub extend). The CLI loads `.env` and needs `NUXT_DATABASE_URL` (and `NUXT_AUTH_DB_PROVIDER` for SQLite), plus `BETTER_AUTH_URL` or `NUXT_PUBLIC_BASE_URL`.

The generated tables belong to the app, not the layer: they depend on the app's `NUXT_AUTH_DB_PROVIDER` and the plugins in its `server/auth.options.ts`. Re-export them from `server/db/schema.ts`:

```ts
export * from './auth-schema'
```

Then generate and apply the migration:

```bash
pnpm auth:generate  # writes the better-auth tables to server/db/auth-schema.ts
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
# Magic link email subject (optional - default "Log in to your account")
NUXT_AUTH_MAGIC_LINK_SUBJECT="Sign in to Example"

# Database provider (optional - pg by default, sqlite for SQLite or D1)
NUXT_AUTH_DB_PROVIDER=sqlite

# Who can log in (required: nobody can log in until one is set, see below)
NUXT_AUTH_ALLOWED_DOMAINS=example.com,company.org
NUXT_AUTH_ALLOWED_EMAILS=admin@example.com,user@company.org
# Or allow everyone
# NUXT_AUTH_ALLOWED_EMAILS=*
NUXT_AUTH_ADMIN_EMAILS=admin@example.com,superuser@company.org

# Google login (optional - set all three together, see below)
NUXT_AUTH_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
NUXT_AUTH_GOOGLE_CLIENT_SECRET=your_client_secret
NUXT_PUBLIC_AUTH_GOOGLE_LOGIN=true

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
When [Google login](#google-login) is enabled, it also shows a "Continue with Google" button above the email form.

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

The checks are the `allowlist` plugin in `server/utils/auth.config.ts`, so an app's own hooks add to them instead of replacing them:

- A request hook (`allowListedSignup`) rejects magic-link requests for a disallowed address before any email is sent.
- Database hooks (`allowListedEmail`) run for every sign-in method, Google and other OAuth providers included. The user hook stops disallowed sign-ups. The session hook stops existing users whose email was removed from the lists. Sessions that already exist stay valid until they expire or are revoked.
- A rejected OAuth login redirects to `redirectErrorTo` with `?error=NOT_AUTHORIZED` instead of showing a JSON error.

### Admin Role Assignment
Automatically assign admin role to specific email addresses during user creation. It only applies to new users: adding an email later does not promote an existing user (use the admin plugin or the database for that).

```bash
# Automatically set admin role for these email addresses
NUXT_AUTH_ADMIN_EMAILS=admin@example.com,superuser@company.org
```


## Google Login

Google login is off by default. To turn it on:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create an OAuth client ID of type **Web application**.
2. Add the authorized redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`, for example `https://example.com/api/auth/callback/google`. Add `http://localhost:3000/api/auth/callback/google` too if you test locally.
3. Set all three variables:

```bash
NUXT_AUTH_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
NUXT_AUTH_GOOGLE_CLIENT_SECRET=your_client_secret
NUXT_PUBLIC_AUTH_GOOGLE_LOGIN=true
```

The two credentials turn on the provider on the server. Setting only one of them fails at startup. `NUXT_PUBLIC_AUTH_GOOGLE_LOGIN` shows the button in `MagicLinkLogin`: it is separate because the browser cannot read the private credentials. Without the credentials, the button fails with "provider not found".

On Cloudflare Workers, store `NUXT_AUTH_GOOGLE_CLIENT_SECRET` as a secret, and set the other two as vars.

The [allowlist](#access-restrictions-by-email-address-or-domain) applies to Google logins too. A rejected account is sent to `redirectErrorTo` with `?error=NOT_AUTHORIZED`.

To sign in from your own UI instead of `MagicLinkLogin`:

```ts
await useAuth().client.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
```

### Other providers

1. Add the provider to `socialProviders` in the app's `server/auth.options.ts` (see [Customize better-auth](#customize-better-auth); [provider list](https://www.better-auth.com/docs/concepts/oauth), for example [GitHub](https://www.better-auth.com/docs/authentication/github)). For a generic OpenID Connect provider (Keycloak, Authentik, an Azure tenant), add the [`genericOAuth` plugin](https://www.better-auth.com/docs/plugins/generic-oauth) to `plugins` instead.
2. Register `<BETTER_AUTH_URL>/api/auth/callback/<provider>` as the redirect URI in the provider's console.
3. Add a button: `useAuth().client.signIn.social({ provider: '<provider>' })`. `MagicLinkLogin` only has the Google one.

The allowlist, admin emails, account linking, and error page work for every provider. They trust the email the provider returns, so only use providers that return verified emails.

## Email Templates

The default magic link email template is `server/assets/magic-link.html` in this layer. To override it, add `server/assets/magic-link.html` in the host app. Set the subject with `NUXT_AUTH_MAGIC_LINK_SUBJECT` (or `runtimeConfig.auth.magicLinkSubject`); the default is "Log in to your account".

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