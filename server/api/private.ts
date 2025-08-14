export default defineProtectedHandler(async (event) => {
  return {
    message: 'Hello Private',
    user: event.context.auth?.user,
  }
})
