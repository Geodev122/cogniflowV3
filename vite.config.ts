// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@pages': path.resolve(__dirname, 'src/pages')
    }
  },
  plugins: [
    tsconfigPaths(), // resolve TS path aliases from tsconfig
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    // Use esbuild for minification to avoid terser edge-cases that can produce
    // "import is not a function" during mangling/minify for some dynamic import
    // shapes. esbuild is faster and generally safer for modern ESM builds.
    minify: 'esbuild',
    // Configure esbuild to drop console/debugger statements similarly to terserOptions
    esbuild: {
      drop: ['console', 'debugger'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'lucide-react'],
    exclude: [],
  },
  server: {
    hmr: { overlay: false },
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
