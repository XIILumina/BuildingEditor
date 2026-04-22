import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const hotFile = path.resolve(__dirname, 'public/hot');

const cleanHotFile = () => ({
    name: 'clean-hot-file',
    closeBundle() {
        if (fs.existsSync(hotFile)) fs.unlinkSync(hotFile);
    },
    buildEnd() {
        if (fs.existsSync(hotFile)) fs.unlinkSync(hotFile);
    },
});

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        cleanHotFile(),
    ],
    server: {
        host: '127.0.0.1',
        port: 5173,
        cors: true,
    },
    build: {
        manifest: true,
        outDir: 'public/build',
    },
});