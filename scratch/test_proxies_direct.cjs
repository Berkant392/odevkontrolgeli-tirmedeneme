async function testProxies() {
    const targetUrl = 'https://api.github.com/zen';
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            console.log("Status:", res.status);
            if (res.ok) {
                const data = await res.json().catch(() => null) || await res.text();
                console.log("Response text length:", data ? JSON.stringify(data).length : 0);
            }
        } catch (e) {
            console.error("Proxy error:", e.message);
        }
    }
}

testProxies();
