import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// תצורת Vite בסיסית לקליינט React
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
