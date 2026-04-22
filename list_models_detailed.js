const axios = require('axios');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModelsDetailed() {
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = response.data;
        console.log("--- Detailed Model Capabilities ---");
        data.models.forEach(m => {
            if (m.name.includes('veo') || m.name.includes('imagen')) {
                console.log(`Model: ${m.name}`);
                console.log(`Methods: ${m.supportedGenerationMethods.join(', ')}`);
                console.log('---');
            }
        });
    } catch (e) {
        console.error(e.message);
    }
}
listModelsDetailed();
