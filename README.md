# Auth Layer

Nuxt layer providing magic link authentication with better-auth.

## Setup

### Install layer and dependencies

```bash
pnpx giget gh:awecode/nuxt-better-auth-layer layers/auth
pnpm install better-auth aws4fetch
cp -r layers/auth/server/assets server/ 2>/dev/null || (mkdir -p server && cp -r layers/auth/server/assets server/)
```

### Migrate database

An example drizzle integration with sqlite is provided in the layer in the file `server/utils/auth.ts`. You can use this as a starting point to integrate with your own database. Use the following to generate the schema and migrate the database. Change the schema file paths to match your own if necessary.

```bash
npx @better-auth/cli@latest generate --config layers/auth/server/utils/auth.ts --output server/db/auth_schema.ts --yes
echo -e "\nexport * from './auth_schema'" >> server/db/schema.ts
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Using with Tailwind

Tailwind components are provided with the layer. To use them, [install Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nuxt).
And add `@source '../../../layers/';` to your `app/assets/css/main.css` to prevent the layer's tailwind classes from being purged by Tailwind's tree-shaking.

```bash
echo -e "\n@source '../../../layers/';" >> app/assets/css/main.css
```

### Configure environment variables

```bash
# SES Configuration (required for production for sending emails)
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=your_access_key_id
SES_SECRET_KEY=your_secret_key
SES_FROM_EMAIL=noreply@example.com

# Access restrictions (optional - see below)
NUXT_AUTH_ALLOWED_DOMAINS=example.com,company.org
NUXT_AUTH_ALLOWED_EMAILS=admin@example.com,user@company.org
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
Retrieves the current session from the event context. If not already cached, fetches it from the auth API.

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

For web applications, use the default cookie-based authentication. Bearer tokens are needed for mobile apps or other clients that can't use cookies. Use the token received during login as the bearer token.

```bash
# Example API call with Bearer token
curl -X POST https://yourapp.com/api/protected \
  -H "Authorization: Bearer t0k3ng035h3r3..." \
  -H "Content-Type: application/json" \
  -d '{"data": "example"}'
```

## Access Restrictions by Email Address or Domain

You can restrict authentication to specific email domains or individual email addresses using environment variables. To enable this, use the allowDomains and/or allowEmails hook utils in better auth config hooks.

```ts
// server/utils/auth.ts
import { allowDomains, allowEmails, setAdminForEmail } from '../lib/hook-utils'

export const auth = betterAuth({
  // ...
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      allowDomains(ctx)
      allowEmails(ctx)
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return setAdminForEmail(user)
        },
      },
    },
  },
})
```

### Allowed Domains
Restrict sign-ups to specific email domains:

```bash
# Allow only users with @example.com or @company.org emails
NUXT_AUTH_ALLOWED_DOMAINS=example.com,company.org
# Allow any domain (default behavior)
NUXT_AUTH_ALLOWED_DOMAINS=*
```

### Allowed Emails
Restrict sign-ups to specific email addresses:

```bash
# Allow only these specific email addresses
NUXT_AUTH_ALLOWED_EMAILS=admin@example.com,user@company.org
# Allow any email (default behavior)
NUXT_AUTH_ALLOWED_EMAILS=*
```

### Admin Role Assignment
Automatically assign admin role to specific email addresses during user creation:

```bash
# Automatically set admin role for these email addresses
NUXT_AUTH_ADMIN_EMAILS=admin@example.com,superuser@company.org
```


## Email Templates

Customize the magic link email template at `server/assets/magic-link.html`.

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