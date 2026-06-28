const https = require('https');

const playlistId = 'PLOU2XLYxmsIKd3mB8Q9g2F0aV42N4fB';
const url = `https://www.youtube.com/playlist?list=${playlistId}`;

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.tr+FX+999'
    }
}, (res) => {
    console.log("Status Code:", res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Body length:", data.length);
        console.log("Contains ytInitialData:", data.includes('ytInitialData'));
        if (data.includes('ytInitialData')) {
            const match = data.match(/ytInitialData\s*=\s*({.+?});/) || data.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
            console.log("Found match:", !!match);
        }
    });
});
