// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
  manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('wouter')) return 'vendor-router';
            if (id.includes('drizzle-orm')) return 'vendor-drizzle';
            if (id.includes('supabase')) return 'vendor-supabase';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
