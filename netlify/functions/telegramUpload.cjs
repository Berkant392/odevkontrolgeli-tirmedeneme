
exports.handler = async (event, context) => {
    // Sadece POST isteklerini kabul et
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const rawTokens = process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!rawTokens || !CHAT_ID) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Eksik Telegram yapılandırması' }) };
    }
    
    const tokens = rawTokens.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Geçerli token bulunamadı' }) };
    }

    const botIndex = Math.floor(Math.random() * tokens.length);
    const BOT_TOKEN = tokens[botIndex];

    try {
        const body = JSON.parse(event.body);
        const { imageBase64, filename = 'question.jpg', caption = '' } = body;

        if (!imageBase64) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Görsel verisi bulunamadı' }) };
        }

        // Base64 string'ini Buffer'a çevir (data:image/jpeg;base64, kısmını ayıkla)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const blob = new Blob([buffer], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', blob, filename);
        if (caption) {
            formData.append('caption', caption);
        }

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (response.status === 429) {
            const data = await response.json();
            const retryAfter = data.parameters?.retry_after || 5;
            return {
                statusCode: 429,
                body: JSON.stringify({ error: 'Rate limit', retry_after: retryAfter })
            };
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse JSON. Response text:", responseText);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Invalid response from Telegram', details: responseText })
            };
        }

        if (data.ok) {
            // Telegram, fotoğrafı farklı çözünürlüklerde dizi olarak döner. En büyüğü (en sonuncusu) alırız.
            const photos = data.result.photo;
            const bestPhoto = photos[photos.length - 1];
            
            // Hangi botun yüklediğini bilmek için file_id'nin başına botIndex ekliyoruz (Örn: 2:AgACAg...)
            const prefixedFileId = `${botIndex}:${bestPhoto.file_id}`;
            
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, file_id: prefixedFileId })
            };
        } else {
            console.error('Telegram API Error:', data);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram upload failed', details: data })
            };
        }
    } catch (error) {
        console.error('Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
