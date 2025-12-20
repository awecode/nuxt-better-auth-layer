import { magicLinkClient, adminClient } from 'better-auth/client/plugins'

export const authClientConfig = {
  plugins: [magicLinkClient(), adminClient()],
}
