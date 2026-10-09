import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,        // Port number 
    host: true,        // Local network access
    open: false,       // Auto browser open 
    strictPort: false, // Agar port busy ho toh next available use karo
  },
})