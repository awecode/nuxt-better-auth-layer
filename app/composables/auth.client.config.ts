import { magicLinkClient, adminClient, customSessionClient } from 'better-auth/client/plugins'
import type { BetterAuthClientOptions } from 'better-auth/client'
import appClientOptions from '#auth-client-options'

// Client plugins from the app's app/auth.client.options.ts, typed so their
// methods (such as client.organization.*) show up on useAuth().client.
type AppClientPlugins = typeof appClientOptions extends { plugins: infer P extends unknown[] } ? P : []
const appClientPlugins = ((appClientOptions as BetterAuthClientOptions).plugins ?? []) as AppClientPlugins

export const authClientConfig = {
  plugins: [magicLinkClient(), adminClient(), ...appClientPlugins, customSessionClient()],
}
