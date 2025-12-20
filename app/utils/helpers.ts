export const getErrorMessage = (error: Error | Record<string, unknown>) => {
  return typeof error === 'object' && error !== null
    ? (error as Record<string, any>)?.data?.message ?? (error as Record<string, unknown>)?.message ?? String(error)
    : String(error)
}
