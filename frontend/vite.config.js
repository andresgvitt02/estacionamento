import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Proxy /api pro backend Express em dev: evita configurar CORS pra cada
// origem de desenvolvimento e já deixa o front chamando caminhos relativos
// (/api/...), igual vai funcionar quando os dois ficarem atrás do mesmo
// domínio em produção.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
