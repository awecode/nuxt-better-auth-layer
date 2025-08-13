<template>
  <div class="w-full max-w-md border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div
      v-if="sent"
      class="space-y-4"
    >
      <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Check your email
      </h1>
      <p class="text-gray-600 dark:text-gray-400 font-bold">
        Login using the magic link sent to {{ email }}.
      </p>
      <div class="space-y-2">
        <div class="text-gray-600 dark:text-gray-400">
          Or enter the token received in your email.
        </div>
        <input
          id="token"
          v-model="token"
          type="text"
          placeholder="Token"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-600 dark:focus:ring-gray-700"
        >
        <button
          class="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          :disabled="isVerifying || !token"
          @click="verifyToken"
        >
          Verify
        </button>
      </div>
      <p
        class="text-sm text-gray-600 dark:text-gray-400"
      >
        Did not receive an email?
        <button
          class="text-blue-500"
          @click="sent = false"
        >
          Resend
        </button>
      </p>
    </div>
    <div
      v-else
      class="space-y-4"
    >
      <h1
        class="text-lg font-semibold text-gray-900 dark:text-gray-100"
      >
        Log in using email
      </h1>

      <div class="space-y-2">
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="your@email.com"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-600 dark:focus:ring-gray-700"
          :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-500': email && !isValidEmail }"
        >
      <!-- <p
        v-if="email && !isValidEmail"
        class="text-xs text-red-600 dark:text-red-400"
      >
        Enter a valid email address.
      </p> -->
      </div>

      <button
        class="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        :disabled="isLoading || !isValidEmail"
        @click="signInWithMagicLink"
      >
        {{ isLoading ? 'Sending…' : 'Continue with email' }}
      </button>

      <p
        class="text-xs text-gray-500 dark:text-gray-400"
      >
        You can use the link in your email or a one-time token to log in.
      </p>
      <p
        v-if="errorMessage"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~~/layers/auth/utils/auth'

// const session = await authClient.useSession(useFetch)

const email = ref('test@test.com')
const isLoading = ref(false)
const sent = ref(false)
const errorMessage = ref('')
const token = ref('')
const isVerifying = ref(false)
const { public: { auth } } = useRuntimeConfig()

const isValidEmail = computed(() => {
  const value = email.value.trim()
  if (!value) return false
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(value)
})

const signInWithMagicLink = async () => {
  if (!isValidEmail.value) {
    errorMessage.value = 'Enter a valid email address.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  const { error } = await authClient.signIn.magicLink({
    email: email.value,
    callbackURL: auth.loginCallbackURL,
    newUserCallbackURL: auth.newUserCallbackURL,
    errorCallbackURL: auth.errorCallbackURL,
  })
  if (error) {
    errorMessage.value = error.message || 'Failed to send email'
  }
  else {
    sent.value = true
  }
  isLoading.value = false
}

const verifyToken = async () => {
  if (!token.value) return
  isVerifying.value = true
  errorMessage.value = ''
  const { error } = await authClient.magicLink.verify({
    query: {
      token: token.value,
    },
  })
  if (error) {
    errorMessage.value = error.message || 'Invalid or expired code'
  }
  else {
    navigateTo(auth.loginCallbackURL)
  }
  isVerifying.value = false
}
</script>
