<template>
  <div class="bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 m-4 flex flex-col gap-4">
    <div v-if="user">
      You are logged in as {{ user.email }}.
    </div>
    <div v-else>
      You are not logged in.
    </div>
    <div v-if="user?.role">
      Your role is {{ user.role }}.
    </div>
    <div v-if="user?.role === 'admin'">
      <NuxtLink class="underline" to="/admin"> Visit Admin Dashboard </NuxtLink>
    </div>
    <div>
      <button v-if="user"
        class="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        @click="signOut()">
        Log out
      </button>
      <NuxtLink v-else
        class="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        to="/login">
        Log in
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  auth: false,
})

const { user, signOut } = useAuth()
</script>
