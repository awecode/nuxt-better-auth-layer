import { magicLinkClient, adminClient, customSessionClient } from 'better-auth/client/plugins'

export const authClientConfig = {
  plugins: [magicLinkClient(), adminClient(), customSessionClient()],
}
