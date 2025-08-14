<template>
  <div>
    <h1>Public Page</h1>
    <p>
      Even unauthorized users can access this page.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  auth: false,
})
</script>
