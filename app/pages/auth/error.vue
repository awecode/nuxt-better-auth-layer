<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <div
      class="w-full max-w-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-4"
    >
      <h1 class="text-lg font-semibold">
        Login failed
      </h1>
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ message }}
      </p>
      <NuxtLink
        to="/login"
        class="inline-flex w-full items-center justify-center bg-neutral-900 px-4 py-2 text-white transition dark:bg-neutral-100 dark:text-neutral-900"
      >
        Back to login
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  auth: false,
})

useSeoMeta({
  title: 'Login error',
  robots: 'noindex, nofollow',
})

const route = useRoute()

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: 'This login link is invalid or was already used. Email scanners often open links before you do, which can burn a one-time link. Request a new link, or paste the token from the email on the login page.',
  EXPIRED_TOKEN: 'This login link has expired. Request a new one from the login page.',
  NOT_AUTHORIZED: 'This account is not allowed to log in.',
  access_denied: 'Google login was cancelled.',
  account_not_linked: 'This email already has an account. Log in with your email link first.',
}

const message = computed(() => {
  const code = typeof route.query.error === 'string' ? route.query.error : ''
  return ERROR_MESSAGES[code] || 'Something went wrong while signing in. Try again.'
})
</script>
