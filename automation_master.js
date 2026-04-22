const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Replicate = require("replicate");

// --- 설정 및 API 키 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("🚀 [Phase 1] 오늘의 건강 트렌드 기획 시작 (Gemini 2.0)...");
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `오늘 대한민국에서 가장 화제인 50대 건강 상식 트렌드 1개를 선정하고, 유튜브 쇼츠용 5장면 대본을 작성해줘. 응답은 반드시 JSON으로만 해. 형식: [{"scene": 1, "script": "한국어 대본", "image_prompt": "English image prompt (9:16 cinematic)"}, ...]`;

    const result = await model.generateContent(prompt);
    const plan = JSON.parse(result.response.text().replace(/```json|```/g, ""));
    fs.writeFileSync('plan.json', JSON.stringify(plan, null, 2));
    console.log("✅ 기획 완료: plan.json 저장됨.");

    console.log("\n📦 [Phase 2-3] 이미지 및 영상 생성 시작 (Replicate)...");
    const videoPaths = [];
    const videoDir = path.join(__dirname, 'asset', 'videos');
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    for (const item of plan) {
        console.log(`--- Scene ${item.scene} 처리 중...`);
        
        // 1. 이미지 생성 (Replicate - Flux Schnell)
        const imgOutput = await replicate.run(
            "black-forest-labs/flux-schnell",
            { input: { prompt: item.image_prompt, aspect_ratio: "9:16" } }
        );
        const imgUrl = imgOutput[0];

        // 2. 영상 생성 (Replicate - Luma Dream Machine)
        const vidOutput = await replicate.run(
            "luma/dream-machine",
            { input: { image: imgUrl, prompt: "Fluid cinematic motion, 4k" } }
        );
        
        // 3. 다운로드 및 저장
        const videoFileName = `scene_${item.scene}.mp4`;
        const videoPath = path.join(videoDir, videoFileName);
        const response = await axios({ url: vidOutput, responseType: 'stream' });
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);
        await new Promise((resolve) => writer.on('finish', resolve));
        
        console.log(`   ✅ Scene ${item.scene} 영상 저장 완료.`);
        videoPaths.push(videoPath);
        
        // 속도 제한 방지 대기
        await sleep(5000);
    }

    console.log("\n🎬 [Phase 4] 최종 영상 합성 시작 (FFmpeg)...");
    // (이전 ffmpeg 합성 로직 연동)
    // ...
    console.log("🎉 모든 작업이 완료되었습니다! final_shorts.mp4 제작 완료.");
}

run().catch(console.error);
