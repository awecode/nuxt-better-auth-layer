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
      class="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      @click="signOut()"
    >
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
