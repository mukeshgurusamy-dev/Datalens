import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-export-pdf'
            if (id.includes('xlsx')) return 'vendor-export-xlsx'
            if (id.includes('motion')) return 'vendor-motion'
            if (id.includes('papaparse')) return 'vendor-parser'
          }
        },
      },
    },
  },
})
