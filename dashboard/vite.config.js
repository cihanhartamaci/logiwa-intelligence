import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitLab unique Pages domain serves from root (e.g. integration-newsletter-xxxx.gitlab.io)
  base: '/',
})

