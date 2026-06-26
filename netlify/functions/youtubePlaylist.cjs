// ============================================================
// YouTube Playlist Netlify Function — InnerTube Pagination
// ------------------------------------------------------------
// Plansal mimarisinden ilham alınarak yeniden yazıldı.
//
// SORUN: Eski versiyon sadece ilk ~8-15 videoyu çekiyordu çünkü
//        YouTube ytInitialData'da sadece ilk sayfayı veriyor.
//        Geri kalan videolar "continuation" tokenları ile sayfalanıyor.
//
// ÇÖZÜM: YouTube InnerTube browse API'sini kullanarak TÜM sayfaları
//        takip edip 60, 200, hatta 500+ videoluk playlist'lerin
//        tamamını çekiyoruz. API key gerektirmez — YouTube'un
//        kendi dahili public key'i kullanılıyor.
//
// CORS: Sunucu tarafında çalıştığı için CORS sorunu yok.
// ============================================================
const https = require('https');
const zlib = require('zlib');

// YouTube InnerTube public API key (YouTube web sitesinin kendi key'i — ücretsiz)
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CLIENT = {
    clientName: 'WEB',
    clientVersion: '2.20250101.00.00',
    hl: 'tr',
    gl: 'TR'
};

// ============================================================
// HTTP İSTEKLERİ
// ============================================================

/** GET isteği — YouTube playlist sayfası HTML'ini çeker */
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate'
            },
            timeout: 10000
        }, (res) => {
            // Redirect takibi
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpGet(res.headers.location).then(resolve).catch(reject);
            }

            const encoding = res.headers['content-encoding'];
            let stream = res;
            if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
            else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());

            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('HTTP GET timeout')); });
    });
}

/** POST isteği — InnerTube browse API'ye continuation token gönderir */
function httpPost(url, bodyObj) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(bodyObj);
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'X-YouTube-Client-Name': '1',
                'X-YouTube-Client-Version': INNERTUBE_CLIENT.clientVersion
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            const encoding = res.headers['content-encoding'];
            let stream = res;
            if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
            else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());

            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                } catch (e) {
                    reject(new Error('InnerTube JSON parse hatası'));
                }
            });
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('InnerTube POST timeout')); });
        req.write(bodyStr);
        req.end();
    });
}

// ============================================================
// JSON AYRIŞTIRMA
// ============================================================

/**
 * ytInitialData JSON'ını HTML'den güvenli şekilde çıkarır.
 * Regex yerine bracket counting kullanır — büyük JSON'larda kesme olmaz.
 */
function extractYtInitialData(html) {
    const marker = 'ytInitialData';
    const idx = html.indexOf(marker);
    if (idx === -1) return null;

    // '{' karakterini bul
    const start = html.indexOf('{', idx + marker.length);
    if (start === -1) return null;

    // Bracket counting ile eşleşen '}' yi bul
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < html.length && i < start + 5000000; i++) {
        const ch = html[i];

        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                try {
                    return JSON.parse(html.substring(start, i + 1));
                } catch (e) {
                    console.error('ytInitialData JSON parse failed at char', i);
                    return null;
                }
            }
        }
    }
    return null;
}

/**
 * ISO 8601 süre → "M:SS" / "H:MM:SS" formatı
 * Örn: "PT15M30S" → "15:30", "PT1H5M3S" → "1:05:03"
 */
function isoDurationToText(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return '';
    const h = parseInt(m[1] || '0');
    const mi = parseInt(m[2] || '0');
    const s = parseInt(m[3] || '0');
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return h > 0 ? (h + ':' + pad(mi) + ':' + pad(s)) : (mi + ':' + pad(s));
}

/**
 * playlistVideoRenderer'dan video bilgilerini çıkarır
 */
function parseVideoRenderer(renderer, index) {
    if (!renderer || !renderer.videoId) return null;

    const id = renderer.videoId;
    const title = renderer.title?.runs?.[0]?.text
        || renderer.title?.simpleText
        || `Ders ${index + 1}`;

    // Süre: lengthText veya lengthSeconds
    let duration = renderer.lengthText?.simpleText
        || renderer.lengthText?.runs?.[0]?.text
        || '';
    
    const lengthSec = parseInt(renderer.lengthSeconds || '0');
    if (!duration && lengthSec > 0) {
        const h = Math.floor(lengthSec / 3600);
        const m = Math.floor((lengthSec % 3600) / 60);
        const s = lengthSec % 60;
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        duration = h > 0 ? (h + ':' + pad(m) + ':' + pad(s)) : (m + ':' + pad(s));
    }

    // Thumbnail: en yüksek çözünürlüklüyü al
    let thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const thumbs = renderer.thumbnail?.thumbnails;
    if (thumbs && thumbs.length > 0) {
        // maxres → hq → mq sırasıyla dene
        const best = thumbs.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a), thumbs[0]);
        if (best.url) thumb = best.url;
    }

    return {
        videoId: id,
        title,
        thumb,
        duration,
        durationIso: renderer.lengthSeconds 
            ? `PT${Math.floor(lengthSec/3600) > 0 ? Math.floor(lengthSec/3600)+'H' : ''}${Math.floor((lengthSec%3600)/60)}M${lengthSec%60}S`
            : ''
    };
}

// ============================================================
// ANA FONKSİYON
// ============================================================

exports.handler = async (event) => {
    const CORS_HEADERS = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=300' // 5dk CDN cache
    };

    // OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { list } = event.queryStringParameters || {};
        if (!list || !/^[A-Za-z0-9_-]+$/.test(list)) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "Geçersiz veya eksik 'list' parametresi." })
            };
        }

        // ============================================================
        // ADIM 1: YouTube playlist sayfasını çek ve ytInitialData'yı parse et
        // ============================================================
        console.log(`[ytPlaylist] Fetching playlist: ${list}`);
        const html = await httpGet(`https://www.youtube.com/playlist?list=${list}`);

        if (!html || html.length < 1000) {
            return {
                statusCode: 502,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'YouTube sayfası yüklenemedi. Lütfen linki kontrol edin.' })
            };
        }

        // Playlist bulunamadı kontrolü
        if (html.includes('"alerts"') && (html.includes('Bu oynatma listesi mevcut değil') || html.includes('playlist does not exist'))) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Bu oynatma listesi bulunamadı veya gizli.' })
            };
        }

        const ytData = extractYtInitialData(html);
        if (!ytData) {
            return {
                statusCode: 500,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'YouTube verisi ayrıştırılamadı (ytInitialData bulunamadı).' })
            };
        }

        // ============================================================
        // ADIM 2: Playlist başlığı ve thumbnail çıkar
        // ============================================================
        let playlistTitle = 'YouTube Oynatma Listesi';
        try {
            // Yeni YouTube yapısı
            const header = ytData.header?.playlistHeaderRenderer;
            if (header?.title?.simpleText) {
                playlistTitle = header.title.simpleText;
            } else if (header?.title?.runs?.[0]?.text) {
                playlistTitle = header.title.runs[0].text;
            } else {
                // HTML <title> tag'inden fallback
                const titleMatch = html.match(/<title>(.+?)<\/title>/);
                if (titleMatch) {
                    playlistTitle = titleMatch[1].replace(' - YouTube', '').trim();
                }
            }
        } catch (e) {
            console.warn('[ytPlaylist] Title extraction warning:', e.message);
        }

        // ============================================================
        // ADIM 3: İlk sayfadaki videoları çıkar (Recursive Search)
        // ============================================================
        const allVideos = [];
        let continuationToken = null;

        // JSON içinde rekürsif olarak belirli anahtarları arar
        function findInJson(obj, keyToFind, results) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach(item => findInJson(item, keyToFind, results));
            } else {
                for (const k in obj) {
                    if (k === keyToFind) {
                        results.push(obj[k]);
                    } else {
                        findInJson(obj[k], keyToFind, results);
                    }
                }
            }
        }

        const videoRenderers = [];
        findInJson(ytData.contents, 'playlistVideoRenderer', videoRenderers);
        
        for (const item of videoRenderers) {
            const vid = parseVideoRenderer(item, allVideos.length);
            if (vid) allVideos.push(vid);
        }

        const continuationItems = [];
        findInJson(ytData.contents, 'continuationItemRenderer', continuationItems);
        if (continuationItems.length > 0) {
            continuationToken = continuationItems[0]?.continuationEndpoint?.continuationCommand?.token;
        }

        console.log(`[ytPlaylist] First page: ${allVideos.length} videos, continuation: ${!!continuationToken}`);

        // ============================================================
        // ADIM 4: Sayfalama — devam tokenlarıyla kalan videoları çek
        // ============================================================
        let pageCount = 1;
        const MAX_PAGES = 50; // Güvenlik limiti (50 × ~100 = ~5000 video max)

        while (continuationToken && pageCount < MAX_PAGES) {
            try {
                const browseUrl = `https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}&prettyPrint=false`;
                const browseBody = {
                    context: { client: INNERTUBE_CLIENT },
                    continuation: continuationToken
                };

                const browseData = await httpPost(browseUrl, browseBody);
                continuationToken = null; // Sıfırla, yeni token varsa tekrar set edilecek

                // Devam videolarını çıkar
                const actions = browseData?.onResponseReceivedActions;
                if (actions && actions.length > 0) {
                    const continuationItems = actions[0]?.appendContinuationItemsAction?.continuationItems;
                    if (continuationItems && Array.isArray(continuationItems)) {
                        for (const item of continuationItems) {
                            if (item.playlistVideoRenderer) {
                                const vid = parseVideoRenderer(item.playlistVideoRenderer, allVideos.length);
                                if (vid) allVideos.push(vid);
                            }
                            if (item.continuationItemRenderer) {
                                continuationToken = item.continuationItemRenderer
                                    ?.continuationEndpoint?.continuationCommand?.token;
                            }
                        }
                    }
                }

                pageCount++;
                console.log(`[ytPlaylist] Page ${pageCount}: total ${allVideos.length} videos`);
            } catch (pageErr) {
                console.warn(`[ytPlaylist] Continuation page ${pageCount + 1} failed:`, pageErr.message);
                break; // Hata olursa mevcut videolarla devam et
            }
        }

        // ============================================================
        // ADIM 5: Sonuç oluştur ve döndür
        // ============================================================
        const firstVideoThumb = allVideos.length > 0 ? allVideos[0].thumb : '';

        console.log(`[ytPlaylist] DONE: "${playlistTitle}" — ${allVideos.length} videos in ${pageCount} pages`);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                title: playlistTitle,
                playlistTitle,
                thumbnail: firstVideoThumb,
                firstVideoThumb,
                videos: allVideos,
                videoCount: allVideos.length
            })
        };

    } catch (error) {
        console.error('[ytPlaylist] Fatal error:', error);

        // Kullanıcı dostu hata mesajları
        let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        if (error.message?.includes('timeout')) {
            userMessage = 'YouTube yanıt vermedi (zaman aşımı). Lütfen tekrar deneyin.';
        } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
            userMessage = 'YouTube sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.';
        }

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: userMessage,
                detail: error.message
            })
        };
    }
};
