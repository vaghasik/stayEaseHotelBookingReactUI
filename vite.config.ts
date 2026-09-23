import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// ESM has no __dirname; derive it from this file's own URL so the setup
// file path below resolves the same way on every OS.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    // A bare relative string here ("./src/test/setup.ts") resolves fine on
    // macOS/Linux but breaks on Windows - Vite ends up generating a
    // malformed module id (/@id/C:/... instead of a real filesystem
    // reference) and every test file fails to load with "Cannot find
    // module". Resolving to an absolute path up front avoids that.
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
    },
  },
})
