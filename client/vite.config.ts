import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

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
        allowedHosts: ['seagull']
    },
    test: {
        environment: 'happy-dom',
        setupFiles: ['./src/test-setup.ts'],
        alias: {
            '@dnd-kit/core': path.resolve('./src/test/mocks/dnd-kit-core.ts'),
            '@dnd-kit/sortable': path.resolve('./src/test/mocks/dnd-kit-sortable.ts'),
            '@dnd-kit/utilities': path.resolve('./src/test/mocks/dnd-kit-utilities.ts'),
        },
    },
}));
