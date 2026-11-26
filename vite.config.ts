import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Datalens/' : '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-export-pdf'
            if (id.includes('write-excel-file') || id.includes('read-excel-file')) return 'vendor-export-xlsx'
            if (id.includes('motion')) return 'vendor-motion'
            if (id.includes('papaparse')) return 'vendor-parser'
          }
        },
      },
    },
  },
})
