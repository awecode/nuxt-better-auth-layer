<template>
  <div class="w-full max-w-md space-y-4 border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <h1
      class="text-lg font-semibold text-gray-900 dark:text-gray-100"
    >
      Sign in with magic link
    </h1>

    <div class="space-y-2">
      <label
        for="email"
        class="block text-sm text-gray-600 dark:text-gray-300"
      >
        Email
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        placeholder="you@example.com"
        class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-600 dark:focus:ring-gray-700"
      >
    </div>

    <button
      class="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
      :disabled="isLoading || !email"
      @click="signInWithMagicLink"
    >
      {{ isLoading ? 'Sending…' : 'Send Magic Link' }}
    </button>

    <p
      v-if="successMessage"
      class="text-sm text-green-600 dark:text-green-400"
    >
      {{ successMessage }}
    </p>
    <p
      v-if="errorMessage"
      class="text-sm text-red-600 dark:text-red-400"
    >
      {{ errorMessage }}
    </p>

    <div class="pt-2">
      <button
        v-if="session.data"
        class="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        @click="authClient.signOut()"
      >
        Sign out
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~~/layers/auth/utils/auth'

const session = await authClient.useSession(useFetch)

const email = ref('test@test.com')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const signInWithMagicLink = async () => {
  if (!email.value) return
  isLoading.value = true
  successMessage.value = ''
  errorMessage.value = ''
  const { error } = await authClient.signIn.magicLink({
    email: email.value,
    callbackURL: '/',
    newUserCallbackURL: '/',
    errorCallbackURL: '/error',
  })
  if (error) {
    errorMessage.value = error.message || 'Failed to send magic link'
  }
  else {
    successMessage.value = 'Magic link sent. Check your email.'
  }
  isLoading.value = false
}
</script>
