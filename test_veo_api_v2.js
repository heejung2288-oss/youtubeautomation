const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testVeo() {
    console.log("?é¨ Gemini Veo 3.1-Lite ?ÅÏÑ∏ ?åÏä§???úÏûë...");
    
    try {
        // ?îÎìú?¨Ïù∏?∏Î? ?òÎÇò??Ï≤¥ÌÅ¨?¥Î≥¥Í≤†Ïäµ?àÎã§.
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predict?key=${GEMINI_API_KEY}`,
            {
                instances: [{ prompt: "A cinematic flow of healthy lifestyle, 9:16 vertical" }]
            }
        ).catch(err => {
            console.error("DEBUG:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
            throw err;
        });
        
        console.log("???±Í≥µ! Î¶¨ÌÑ¥:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        // ?¥Î? ?∏Îì§ÎßÅÎê®
    }
}

testVeo();
