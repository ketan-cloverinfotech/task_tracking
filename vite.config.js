import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths work on any GitHub Pages repo name, no manual base path change needed.
  base: './',
})
