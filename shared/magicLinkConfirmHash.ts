export function parseMagicLinkConfirmHash(hash: string) {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const token = params.get('token')?.trim() ?? ''
  return {
    token,
    callbackURL: params.get('callbackURL') ?? params.get('redirect'),
  }
}
