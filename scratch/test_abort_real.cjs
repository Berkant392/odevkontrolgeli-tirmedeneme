const https = require('https');

const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
const url = `https://www.youtube.com/playlist?list=${playlistId}`;

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Length:", data.length);
        console.log("Contains ytInitialData:", data.includes('ytInitialData'));
    });
});
