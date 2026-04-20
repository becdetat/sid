import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => ({
    plugins: [react(), tailwindcss()],
    define: {
        __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? 'dev'),
    },
    server: {
        host: true,
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
    test: {
        environment: 'happy-dom',
        setupFiles: ['./src/test-setup.ts'],
    },
}));
