const https = require('https');

const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${playlistId}&format=json`;

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            console.log(JSON.parse(data));
        } catch (e) {
            console.log("Response text:", data);
        }
    });
});
