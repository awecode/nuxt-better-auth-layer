<template>
  <div>
    <h1>Private Page</h1>
    <hr>
    <p>
      Only authorized users can access this page.
    </p>
    <hr>
    <p>
      {{ sessionData }}
    </p>
    <hr>
    <button
      class="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      @click="authClient.signOut()"
    >
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '#layers/auth/utils/auth'

definePageMeta({
  auth: true,
})

const { data: sessionData } = await authClient.useSession(useFetch)
</script>
