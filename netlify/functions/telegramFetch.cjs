// Node 18+ uses native fetch
exports.handler = async (event, context) => {
    // Sadece GET isteklerini kabul et
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const rawTokens = process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN;
    const { file_id } = event.queryStringParameters;

    if (!rawTokens || !file_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Eksik parametre veya token' }) };
    }
    
    const tokens = rawTokens.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Geçerli token bulunamadı' }) };
    }

    let botIndex = 0;
    let actualFileId = file_id;
    
    // file_id "2:AgACAg..." şeklinde gelirse index'i ve gerçek id'yi ayır
    if (file_id.includes(':')) {
        const parts = file_id.split(':');
        if (!isNaN(parts[0])) {
            botIndex = parseInt(parts[0], 10);
            actualFileId = parts.slice(1).join(':'); // geri kalan kısmı birleştir
        }
    }

    // Güvenlik: index sınır dışındaysa 0'a düş
    if (botIndex >= tokens.length || botIndex < 0) {
        botIndex = 0;
    }

    const BOT_TOKEN = tokens[botIndex];

    try {
        // 1. file_id ile Telegram'dan dosya yolunu al
        const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${actualFileId}`;
        const fileRes = await fetch(getFileUrl);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Dosya bulunamadı' }) };
        }

        const filePath = fileData.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        // 2. Bot token'ını istemciden gizlemek için dosyayı sunucuda indirip proxy olarak gönderiyoruz
        const imageRes = await fetch(downloadUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000' // Tarayıcıda 1 yıl cache
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Fetch Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
