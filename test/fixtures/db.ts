// Stands in for the app's `~~/server/utils/db` in tests.
export type Db = { id: string }
export const useDb = (): Db => ({ id: 'db' })
export const createDbClient = (): Db => ({ id: 'cli' })
