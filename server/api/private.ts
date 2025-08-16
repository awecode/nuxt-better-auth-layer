export default defineAuthenticatedHandler(async (event) => {
  return {
    message: 'Hello Private',
    user: event.context.auth?.user,
  }
})
