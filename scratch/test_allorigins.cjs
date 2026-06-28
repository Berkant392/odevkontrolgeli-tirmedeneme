async function testAllOrigins() {
    const targetUrl = 'https://api.github.com/zen';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        console.log("Fetching proxyUrl:", proxyUrl);
        const res = await fetch(proxyUrl);
        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Response text length:", json.contents ? json.contents.length : 0);
        console.log("Response contents:", json.contents);
    } catch (e) {
        console.error("AllOrigins fetch failed:", e);
    }
}

testAllOrigins();
