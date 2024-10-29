import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000, // or any other port you prefer
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'excel': ['exceljs'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage'],
          'utils': ['papaparse', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: true
  }
})