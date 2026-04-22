const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testVeo() {
    console.log("?¬ Gemini Veo 3.1-Lite ?ìƒ ?ì„± ?ŒìŠ¤???œì‘...");
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:generateVideo?key=${GEMINI_API_KEY}`,
            {
                prompt: "A beautiful cinematic shot of a sunset in the forest, high quality, 4k"
            }
        );
        
        console.log("???±ê³µ! ?‘ë‹µ ?°ì´??", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("???¤íŒ¨:", e.response ? e.response.data : e.message);
    }
}

testVeo();
