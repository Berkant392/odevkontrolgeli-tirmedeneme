// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      injectRegister: 'auto',
      
      workbox: {
        cleanupOutdatedCaches: true,
        // 🔥 GÜNCELLEME: .jpg ve .jpeg uzantıları da derleme takibine eklendi
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
        theme_color: '#0a0812', 
        background_color: '#0a0812', 
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
  ]
});
// cache bust 
