import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/register': 'http://127.0.0.1:5000',
      '/login': 'http://127.0.0.1:5000',
      '/tasks': 'http://127.0.0.1:5000',
      // Puedes añadir más rutas si las necesitas, por ejemplo:
      // '/users': 'http://127.0.0.1:5000',
    }
  }
});