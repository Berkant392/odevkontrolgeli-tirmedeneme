import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', 
      injectRegister: 'auto',
      
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,webmanifest}'],
        
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com.*/i,
            handler: 'NetworkOnly', 
          },
          {
            urlPattern: /.*/,
            handler: 'NetworkFirst', 
            options: {
              cacheName: 'berkant-hoca-live-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 
              }
            }
          }
        ]
      },

      manifest: {
        name: 'Berkant Hoca Eğitim Platformu',
        short_name: 'Berkant Hoca',
        description: 'Ödev Takip ve Eğitim Yönetim Platformu',
        theme_color: '#6366f1', 
        background_color: '#0f172a', 
        display: 'standalone', 
        orientation: 'portrait', 
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // 🔥 BUILD HATALARINI ÇÖZEN KISIM (BURASI EKLENDİ)
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable']
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /node_modules/]
    }
  }
});
