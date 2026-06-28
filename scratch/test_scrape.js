const https = require('https');
const zlib = require('zlib');

const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
const url = `https://www.youtube.com/playlist?list=${playlistId}`;

function testNormal() {
    console.time("Normal Fetch");
    return new Promise((resolve) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        }, (res) => {
            let data = '';
            let bytes = 0;
            res.on('data', (chunk) => {
                data += chunk;
                bytes += chunk.length;
            });
            res.on('end', () => {
                console.timeEnd("Normal Fetch");
                console.log(`Normal Fetch downloaded ${bytes} bytes.`);
                resolve(data);
            });
        });
    });
}

function testOptimized() {
    console.time("Optimized Fetch");
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate'
            }
        }, (res) => {
            const contentEncoding = res.headers['content-encoding'];
            let stream = res;
            
            if (contentEncoding === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (contentEncoding === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            }
            
            let data = '';
            let bytes = 0;
            let aborted = false;

            stream.on('data', (chunk) => {
                if (aborted) return;
                data += chunk;
                bytes += chunk.length;
                
                // Check if we have ytInitialData and its closing tags
                const dataIndex = data.indexOf('ytInitialData');
                if (dataIndex !== -1) {
                    // Look for the end of the script tag containing ytInitialData
                    // ytInitialData is defined as a script variable, e.g.:
                    // ytInitialData = { ... };
                    // The end of the block is followed by ; and </script> or another variable
                    const searchFrom = dataIndex + 13;
                    const scriptEndIndex = data.indexOf(';</script>', searchFrom);
                    if (scriptEndIndex !== -1) {
                        // Found it! Abort early
                        aborted = true;
                        console.log("Optimized Fetch: Found ytInitialData early!");
                        res.destroy(); // Abort the request
                        console.timeEnd("Optimized Fetch");
                        console.log(`Optimized Fetch downloaded ${bytes} bytes.`);
                        resolve(data.substring(0, scriptEndIndex + 10)); // return up to the end of the script tag
                    }
                }
            });

            stream.on('end', () => {
                if (!aborted) {
                    console.timeEnd("Optimized Fetch");
                    console.log(`Optimized Fetch downloaded full page: ${bytes} bytes.`);
                    resolve(data);
                }
            });

            stream.on('error', (err) => {
                // If it's aborted, ignore stream errors
                if (!aborted) {
                    console.error("Stream error:", err);
                    resolve(data);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error("Request error:", err);
            resolve(null);
        });
    });
}

async function run() {
    console.log("--- Starting Scrape Test ---");
    const dataOptimized = await testOptimized();
    const dataNormal = await testNormal();
    
    // Test parsing on optimized data
    if (dataOptimized) {
        const match = dataOptimized.match(/ytInitialData\s*=\s*({.+?});/) || dataOptimized.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
        if (match) {
            try {
                const ytData = JSON.parse(match[1]);
                console.log("Parsed ytData successfully!");
                const titleMatch = dataOptimized.match(/<title>(.+?)<\/title>/);
                console.log("Playlist Title:", titleMatch ? titleMatch[1] : "Not found");
            } catch (e) {
                console.error("Failed to parse JSON from optimized data:", e.message);
            }
        } else {
            console.log("Failed to match ytInitialData regex on optimized data");
        }
    }
}

run();
