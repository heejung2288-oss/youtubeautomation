const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// --- 설정 및 API 키 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("🚀 [Phase 1] 오늘의 건강 트렌드 기획 시작 (Gemini 3.1)...");
    
    const prompt = `오늘 대한민국에서 가장 화제인 50대 건강 상식 트렌드 1개를 선정하고, 유튜브 쇼츠용 5장면 대본을 작성해줘. 응답은 반드시 JSON으로만 해. 형식: [{"scene": 1, "script": "한국어 대본", "image_prompt": "English image prompt (9:16 cinematic)"}, ...]`;

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] }
    );

    const rawText = response.data.candidates[0].content.parts[0].text;
    const plan = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    
    if (!fs.existsSync('asset')) fs.mkdirSync('asset', { recursive: true });
    fs.writeFileSync('plan.json', JSON.stringify(plan, null, 2));
    console.log("✅ 기획 완료: plan.json 저장됨.");

    console.log("\n📦 [Phase 2-3] 이미지 및 영상 생성 시작 (Replicate)...");
    const videoDir = path.join(__dirname, 'asset', 'videos');
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    for (const item of plan) {
        console.log(`--- Scene ${item.scene} 처리 중...`);
        
        try {
            // 1. 이미지 생성
            console.log("   🖼️ 이미지 생성 중...");
            const imgRes = await axios.post(
                "https://api.replicate.com/v1/predictions",
                { version: "130fdec2-7f99-4d64-9f20-9a25032a106f", input: { prompt: item.image_prompt, aspect_ratio: "9:16" } },
                { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } }
            );

            let imgUrl = null;
            while (!imgUrl) {
                await sleep(3000);
                const poll = await axios.get(imgRes.data.urls.get, { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } });
                if (poll.data.status === 'succeeded') imgUrl = poll.data.output[0];
                else if (poll.data.status === 'failed') throw new Error("이미지 생성 실패");
            }

            // 2. 영상 생성
            console.log("   🎬 영상 생성 중...");
            const vidRes = await axios.post(
                "https://api.replicate.com/v1/predictions",
                { version: "luma/dream-machine", input: { image: imgUrl, prompt: "Cinematic slow motion, high quality" } },
                { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } }
            );

            let vidUrl = null;
            while (!vidUrl) {
                await sleep(10000);
                const poll = await axios.get(vidRes.data.urls.get, { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } });
                if (poll.data.status === 'succeeded') vidUrl = poll.data.output;
                else if (poll.data.status === 'failed') throw new Error("영상 생성 실패");
                process.stdout.write("."); // 진행 표시
            }

            // 3. 다운로드
            const videoPath = path.join(videoDir, `scene_${item.scene}.mp4`);
            const writer = fs.createWriteStream(videoPath);
            const download = await axios({ url: vidUrl, responseType: 'stream' });
            download.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));
            
            console.log(`\n   ✅ Scene ${item.scene} 완료.`);
        } catch (e) {
            console.error(`   ❌ Scene ${item.scene} 오류:`, e.message);
        }
    }

    console.log("\n🎬 [Phase 4] 최종 합성 단계 진입 예정...");
}

run().catch(e => console.error("❌ 치명적 오류:", e.message));
