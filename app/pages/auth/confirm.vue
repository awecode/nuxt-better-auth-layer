<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <div
      class="w-full max-w-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-4"
    >
      <h1 class="text-lg font-semibold">
        Confirm login
      </h1>
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        Click the button below to finish signing in.
      </p>
      <button
        class="w-full bg-neutral-900 px-4 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-100 dark:text-neutral-900"
        type="button"
        :disabled="!token || isVerifying"
        @click="confirmLogin"
      >
        {{ isVerifying ? 'Signing in…' : 'Continue to log in' }}
      </button>
      <p
        v-if="errorMessage"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </p>
      <p class="text-sm">
        <NuxtLink
          to="/login"
          class="text-blue-500"
        >
          Request a new login link
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { safeInternalPath } from '#layers/auth/shared/safeInternalPath'

definePageMeta({
  auth: false,
})

useSeoMeta({
  title: 'Confirm login',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const { fetchSession } = useAuth()
const { public: { auth } } = useRuntimeConfig()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value.trim() : ''
})

const redirectTo = computed(() =>
  safeInternalPath(route.query.callbackURL ?? route.query.redirect, auth.redirectUserTo),
)

const errorMessage = ref('')
const isVerifying = ref(false)

if (!token.value) {
  errorMessage.value = 'This login link is missing a token. Request a new link from the login page.'
}

const confirmLogin = async () => {
  if (!token.value || isVerifying.value)
    return

  isVerifying.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/magic-link-verify', {
      method: 'POST',
      body: {
        token: token.value,
      },
    })
    await fetchSession()
    await navigateTo(redirectTo.value)
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error as Error) || 'Invalid or expired token. Request a new login link.'
  }
  finally {
    isVerifying.value = false
  }
}
</script>
