<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <MagicLinkLogin />
  </div>
</template>

<script setup lang="ts">
import { authClient } from '#layers/auth/utils/auth'

definePageMeta({
  auth: false,
})

const { data: sessionData } = await authClient.useSession(useFetch)

if (sessionData.value) {
  const { public: { auth } } = useRuntimeConfig()
  navigateTo(auth.loginCallbackURL)
}
</script>
