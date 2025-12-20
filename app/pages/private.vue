<template>
  <div>
    <h1>Private Page</h1>
    <hr>
    <p>
      Only authorized users can access this page.
    </p>
    <hr>
    <p>
      {{ session }}
    </p>
    <hr>
    <button
      class="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
      @click="signOut()">
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  auth: true,
})

const { session, signOut } = useAuth()
</script>
