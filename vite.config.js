// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const netlifyShim = (env) => ({
  name: 'netlify-shim',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/.netlify/functions/telegramFetch')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const file_id = url.searchParams.get('file_id');
        const rawTokens = env.TELEGRAM_BOT_TOKENS || env.TELEGRAM_BOT_TOKEN;
        
        if (!rawTokens || !file_id) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Eksik parametre veya token' }));
        }
        
        const tokens = rawTokens.split(',').map(t => t.trim()).filter(Boolean);
        let botIndex = 0;
        let actualFileId = file_id;
        
        if (file_id.includes(':')) {
            const parts = file_id.split(':');
            if (!isNaN(parts[0])) {
                botIndex = parseInt(parts[0], 10);
                actualFileId = parts.slice(1).join(':'); 
            }
        }
        if (botIndex >= tokens.length || botIndex < 0) botIndex = 0;
        const BOT_TOKEN = tokens[botIndex];
        
        try {
            const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${actualFileId}`;
            const fileRes = await fetch(getFileUrl);
            const fileData = await fileRes.json();
            
            if (!fileData.ok) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: 'Dosya bulunamadı' }));
            }
            const filePath = fileData.result.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
            
            const imageRes = await fetch(downloadUrl);
            const arrayBuffer = await imageRes.arrayBuffer();
            
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.end(Buffer.from(arrayBuffer));
        } catch (error) {
            console.error('Fetch Error:', error);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: error.message }));
        }
      } else {
        next();
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext'
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    plugins: [
      netlifyShim(env),
      react(),
    VitePWA({
      registerType: 'autoUpdate', 
      injectRegister: 'auto',
      
      workbox: {
        cleanupOutdatedCaches: true,
        // 🔥 GÜNCELLEME: .jpg, .jpeg ve .webp uzantıları da derleme takibine eklendi
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,webmanifest}'],
        
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
  };
});
// cache bust 
