async function checkProduction() {
    const urls = [
        'https://odevtakip-145f5.netlify.app',
        'https://berkant-hoca.netlify.app'
    ];
    
    for (const url of urls) {
        try {
            console.log("Checking:", url);
            const res = await fetch(url);
            console.log("Status:", res.status);
        } catch (e) {
            console.error("Failed to fetch:", url, e.message);
        }
    }
}

checkProduction();
