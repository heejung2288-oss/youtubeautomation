const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testVeoLongRunning() {
    console.log("?é¨ Gemini Veo 3.1-Lite ÎπÑÎèôÍ∏??ùÏÑ± ?åÏä§???úÏûë...");
    
    try {
        // 1. ?ëÏóÖ ?îÏ≤≠
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning?key=${GEMINI_API_KEY}`,
            {
                instances: [{ prompt: "A cinematic slow-motion drone shot of mountains at sunset, 9:16 vertical" }]
            }
        );
        
        console.log("???ëÏóÖ ?ùÏÑ± ?±Í≥µ! Operation ID:", response.data.name);
        console.log("?ÑÏ≤¥ ?ëÎãµ:", JSON.stringify(response.data, null, 2));

        // 2. ?ÅÌÉú Ï°∞Ìöå Î£®ÌîÑ (Polling)
        const operationName = response.data.name;
        console.log("\n???ÅÏÉÅ ?åÎçîÎß?Ï§?.. (?ÅÌÉúÎ•?Ï£ºÍ∏∞?ÅÏúºÎ°?Ï≤¥ÌÅ¨?©Îãà??");

        while (true) {
            await new Promise(r => setTimeout(r, 20000)); // 20Ï¥àÎßà??Ï≤¥ÌÅ¨
            const status = await axios.get(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`);
            
            if (status.data.done) {
                console.log("\n?éä ?ùÏÑ± ?ÑÎ£å!");
                console.log("Í≤∞Í≥º ?∞Ïù¥??", JSON.stringify(status.data.response, null, 2));
                break;
            } else {
                process.stdout.write(".");
            }
        }

    } catch (e) {
        console.error("???§Î•ò:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

testVeoLongRunning();
