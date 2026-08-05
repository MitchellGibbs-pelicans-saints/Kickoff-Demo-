import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Kickoff-Demo-/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
