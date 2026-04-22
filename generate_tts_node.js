const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateTTS() {
    const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'));
    const ttsDir = path.join(__dirname, 'asset', 'tts');

    if (!fs.existsSync(ttsDir)) {
        fs.mkdirSync(ttsDir, { recursive: true });
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const scene of plan) {
        const text = scene.script;
        const filePath = path.join(ttsDir, `scene_${scene.scene}.mp3`);
        
        console.log(`Generating TTS for Scene ${scene.scene}...`);
        
        try {
            // Google Translate TTS URL (Korean)
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input`;
            
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`✅ Saved: scene_${scene.scene}.mp3`);
            // 간격 조절
            await sleep(1000);
        } catch (error) {
            console.error(`❌ Error on Scene ${scene.scene}:`, error.message);
        }
    }
    console.log('--- TTS Generation Complete ---');
}

generateTTS();
