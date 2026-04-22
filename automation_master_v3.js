const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// --- 설정 및 API 키 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;

async function run() {
    console.log("🚀 [Phase 1] 오늘의 건강 트렌드 기획 시작 (Manual API Call)...");
    
    const prompt = `오늘 대한민국에서 가장 화제인 50대 건강 상식 트렌드 1개를 선정하고, 유튜브 쇼츠용 5장면 대본을 작성해줘. 응답은 반드시 JSON으로만 해. 형식: [{"scene": 1, "script": "한국어 대본", "image_prompt": "English image prompt (9:16 cinematic)"}, ...]`;

    // SDK 대신 직접 axios 호출
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
            contents: [{ parts: [{ text: prompt }] }]
        }
    );

    fs.writeFileSync('plan.json', JSON.stringify(plan, null, 2));
    console.log("✅ 기획 완료: plan.json 저장됨.");

    console.log("\n📦 [Phase 2-3] 이미지 및 영상 생성 시작 (Replicate)...");
    const videoPaths = [];
    const assetDir = path.join(__dirname, 'asset');
    const imageDir = path.join(assetDir, 'images');
    const videoDir = path.join(assetDir, 'videos');
    
    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    for (const item of plan) {
        console.log(`--- Scene ${item.scene} 처리 중...`);
        
        try {
            // 1. 이미지 생성 (Replicate - Flux Schnell)
            console.log("   🖼️ 이미지 생성 중...");
            const imgRes = await axios.post(
                "https://api.replicate.com/v1/predictions",
                {
                    version: "130fdec2-7f99-4d64-9f20-9a25032a106f",
                    input: { prompt: item.image_prompt, aspect_ratio: "9:16" }
                },
                { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } }
            );

            // 이미지 완료 대기 (간단한 폴링)
            let imgUrl = null;
            while (!imgUrl) {
                await new Promise(r => setTimeout(r, 3000));
                const poll = await axios.get(imgRes.data.urls.get, { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } });
                if (poll.data.status === 'succeeded') imgUrl = poll.data.output[0];
                if (poll.data.status === 'failed') throw new Error("이미지 생성 실패");
            }

            // 2. 영상 생성 (Replicate - Luma Dream Machine)
            console.log("   🎬 영상 생성 중 (Luma)...");
            const vidRes = await axios.post(
                "https://api.replicate.com/v1/predictions",
                {
                    version: "luma/dream-machine",
                    input: { image: imgUrl, prompt: "Fluid cinematic motion, professional quality" }
                },
                { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } }
            );

            // 영상 완료 대기
            let vidUrl = null;
            while (!vidUrl) {
                await new Promise(r => setTimeout(r, 10000));
                const poll = await axios.get(vidRes.data.urls.get, { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } });
                if (poll.data.status === 'succeeded') vidUrl = poll.data.output;
                if (poll.data.status === 'failed') throw new Error("영상 생성 실패");
                console.log(`      ...상태: ${poll.data.status}`);
            }

            // 3. 다운로드
            const videoPath = path.join(videoDir, `scene_${item.scene}.mp4`);
            const writer = fs.createWriteStream(videoPath);
            const download = await axios({ url: vidUrl, responseType: 'stream' });
            download.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));
            
            console.log(`   ✅ Scene ${item.scene} 제작 및 저장 완료.`);
            videoPaths.push(videoPath);

        } catch (error) {
            console.error(`   ❌ Scene ${item.scene} 오류:`, error.message);
        }
    }
}

run().catch(e => {
    console.error("❌ 오류 발생:", e.response ? e.response.data : e.message);
});
