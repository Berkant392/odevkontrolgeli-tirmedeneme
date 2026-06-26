const https = require('https');

const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
const domains = [
    `https://youtube.com/playlist?list=${playlistId}`,
    `https://m.youtube.com/playlist?list=${playlistId}`
];

function testUrl(url) {
    return new Promise((resolve) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            console.log(`URL: ${url} -> Status: ${res.statusCode}`);
            console.log(`Location: ${res.headers.location}`);
            resolve();
        });
    });
}

async function run() {
    for (const url of domains) {
        await testUrl(url);
    }
}
run();
