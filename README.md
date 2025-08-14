# Auth Layer

Nuxt layer providing magic link authentication with better-auth.

## Setup

2. **Install layer and dependencies:**

```bash
pnpx giget gh:awecode/nuxt-better-auth-layer layers/auth
pnpm install better-auth aws4fetch
cp -r layers/auth/server/assets server/ 2>/dev/null || (mkdir -p server && cp -r layers/auth/server/assets server/)
```

2. **Configure environment variables:**
```bash
# SES Configuration (required for production)
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=your_access_key_id
SES_SECRET_KEY=your_secret_key
SES_FROM_EMAIL=noreply@example.com

# Auth redirects (optional - defaults provided)
NUXT_PUBLIC_AUTH_REDIRECT_USER_TO=/
NUXT_PUBLIC_AUTH_REDIRECT_NEW_USER_TO=/welcome
NUXT_PUBLIC_AUTH_REDIRECT_ERROR_TO=/auth/error
NUXT_PUBLIC_AUTH_REDIRECT_GUEST_TO=/login
NUXT_PUBLIC_AUTH_AUTH_REQUIRED_BY_DEFAULT=true
```

## useAuth Composable

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
Email-based authentication component. Sends both a clickable link and a one-time code that users can enter manually.

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

## API Route Protection

```ts
// server/api/protected.ts
export default defineProtectedHandler(async (event) => {
  const { user } = event.context.auth
  return { message: `Hello ${user.email}` }
})
```

## API Endpoints

- `POST /api/auth/magic-link-send` - Send magic link email
  ```ts
  { email: 'user@example.com' }
  ```

- `POST /api/auth/magic-link-verify` - Verify one-time code
  ```ts
  { token: 'ABC123' }
  ```

## Email Templates

Customize the magic link email template at `server/assets/magic-link.html`.

Available template variables:
- `{{email}}` - User's email
- `{{token}}` - One-time code
- `{{url}}` - Magic link URL
- `{{date}}` - Current date
- `{{time}}` - Current time (UTC)
- `{{useragent}}` - Browser/OS info