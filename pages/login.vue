<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <MagicLinkLogin />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  auth: {
    only: 'guest',
  },
})
</script>
