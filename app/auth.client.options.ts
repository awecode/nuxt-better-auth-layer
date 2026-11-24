import type { BetterAuthClientOptions } from 'better-auth/client'

// Default app client options: none. An app adds its own better-auth client
// plugins (such as organizationClient()) in `app/auth.client.options.ts`,
// which the layer uses instead of this file.
export default {} satisfies BetterAuthClientOptions
