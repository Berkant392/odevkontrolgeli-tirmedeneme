async function testNetwork() {
    try {
        const res = await fetch('https://api.github.com/zen');
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testNetwork();
