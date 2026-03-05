import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    server: {
        host: true,
        open: true,
        port: 5173,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['shield.svg', 'icon-192.png', 'icon-512.png'],
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
            },
            manifest: {
                name: 'SheVest - Financial & Legal Shield',
                short_name: 'SheVest',
                description: 'B2B2C FinTech ecosystem and Auto-FIR generator for women.',
                theme_color: '#10b981',
                background_color: '#fafaf9',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
        }),
    ],
})
