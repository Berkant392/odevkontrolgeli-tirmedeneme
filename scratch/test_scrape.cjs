const https = require('https');

const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
const url = `https://www.youtube.com/playlist?list=${playlistId}`;

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
}, (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Body length:", data.length);
        console.log("Body snippet:", data.substring(0, 1000));
    });
});
