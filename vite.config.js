// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' modu: Yeni versiyon geldiğinde kullanıcıya zorunlu güncelleme ekranı çıkarmamızı sağlar
      registerType: 'prompt', 
      injectRegister: 'auto',
      
      // Service Worker strateji ayarları
      workbox: {
        // Tarayıcı önbelleğindeki eski kalıntıları temizle
        cleanupOutdatedCaches: true,
        // Projedeki tüm JS, CSS ve HTML dosyalarını takip et
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        
        // KRİTİK: Çevrimdışı modu devre dışı bırakmak ve her şeyi ağdan zorlamak için NetworkFirst stratejisi
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com.*/i,
            handler: 'NetworkOnly', // Firebase verilerini asla cache'leme, hep canlı internetten çek
          },
          {
            urlPattern: /.*/,
            handler: 'NetworkFirst', // Sayfa kaynaklarını önce internetten dene, internet yoksa patlasın (çevrimdışı çalıştırma)
            options: {
              cacheName: 'berkant-hoca-live-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 // 1 Günlük geçici ağ kontrol ömrü
              }
            }
          }
        ]
      },

      // PWA Kimlik ve Mobil Kurulum Ayarları
      manifest: {
        name: 'Berkant Hoca Eğitim Platformu',
        short_name: 'Berkant Hoca',
        description: 'Ödev Takip ve Eğitim Yönetim Platformu',
        theme_color: '#6366f1', // Projedeki brandPurple renginizle uyumlu
        background_color: '#0f172a', // Slate-900 koyu arka plan renginiz
        display: 'standalone', // Telefon uygulaması gibi görünmesini sağlar (üst bar gizlenir)
        orientation: 'portrait', // Sadece dikey modda çalıştırır
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
