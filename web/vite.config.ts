import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  server: { port: 5174, host: true },
  test: { environment: 'node' },
});
