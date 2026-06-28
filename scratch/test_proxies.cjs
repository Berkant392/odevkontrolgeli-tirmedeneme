async function testProxies() {
    const playlistId = 'PL8_9wYRykg9JIXmsLWeB0qPQ6DjZQ';
    const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
    ];

    for (let i = 0; i < proxies.length; i++) {
        const proxyUrl = proxies[i];
        console.log(`\nTrying proxy ${i + 1}: ${proxyUrl.substring(0, 80)}...`);
        try {
            const res = await fetch(proxyUrl);
            console.log("Status:", res.status);
            if (!res.ok) continue;
            
            const data = await res.json().catch(() => null) || await res.text();
            const html = data.contents || (typeof data === 'string' ? data : JSON.stringify(data));
            
            console.log("HTML length:", html ? html.length : 0);
            console.log("Contains ytInitialData:", html ? html.includes('ytInitialData') : false);
            
            if (html && html.includes('ytInitialData')) {
                console.log("Success with proxy", i + 1);
                break;
            }
        } catch (e) {
            console.error("Error with proxy:", e.message);
        }
    }
}

testProxies();
