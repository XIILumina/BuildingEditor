import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const hotFile = path.resolve(__dirname, 'public/hot');

// Delete the hot file on build AND when dev server closes cleanly.
const cleanHotFile = () => ({
    name: 'clean-hot-file',
    closeBundle() {
        if (fs.existsSync(hotFile)) fs.unlinkSync(hotFile);
    },
    buildStart() {
        // Remove stale hot file at the very start of every build
        if (fs.existsSync(hotFile)) fs.unlinkSync(hotFile);
    },
    configureServer(server) {
        // Remove hot file when dev server shuts down gracefully
        const cleanup = () => {
            if (fs.existsSync(hotFile)) fs.unlinkSync(hotFile);
        };
        process.once('SIGTERM', cleanup);
        process.once('SIGINT', cleanup);
        server.httpServer?.once('close', cleanup);
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
        manifest: 'manifest.json',
        outDir: 'public/build',
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
    },
});