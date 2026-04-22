const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require("replicate");

// --- 설정 및 API 키 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("🚀 [Phase 1] 기획 데이터 로드 중...");
    const plan = JSON.parse(fs.readFileSync('plan.json', 'utf-8'));

    console.log("\n📦 [Phase 2-3] 고성능 SDK 모드로 에셋 생성 시작...");
    const videoDir = path.join(__dirname, 'asset', 'videos');
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    for (const item of plan) {
        console.log(`\n--- Scene ${item.scene} 시작 ---`);
        
        try {
            // 1. 이미지 생성 (Replicate SDK 사용)
            console.log("   🖼️ 이미지 생성 중 (Flux)...");
            const imgOutput = await replicate.run(
                "black-forest-labs/flux-schnell",
                { input: { prompt: item.image_prompt, aspect_ratio: "9:16" } }
            );
            const imgUrl = imgOutput[0];
            console.log(`   ✅ 이미지 완료: ${imgUrl.substring(0, 50)}...`);

            await sleep(5000); // 429 방지

            // 2. 영상 생성 (Luma Dream Machine)
            console.log("   🎬 영상 생성 중 (Luma)...");
            const vidOutput = await replicate.run(
                "luma/dream-machine",
                { input: { image: imgUrl, prompt: "High quality cinematic motion, 4k, vertical" } }
            );
            // Luma의 output은 string(URL)인 경우가 많음
            const vidUrl = vidOutput;
            console.log(`   ✅ 영상 완료: ${vidUrl.substring(0, 50)}...`);

            // 3. 다운로드
            const videoPath = path.join(videoDir, `scene_${item.scene}.mp4`);
            const writer = fs.createWriteStream(videoPath);
            const download = await axios({ url: vidUrl, responseType: 'stream' });
            download.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));
            
            console.log(`   💾 Scene ${item.scene} 저장 성공.`);
            
            await sleep(10000); // 다음 장면 전 충분한 휴식
        } catch (e) {
            console.error(`   ❌ Scene ${item.scene} 오류 발생:`, e.message);
            // 429 등의 오류가 나면 더 길게 대기
            if (e.message.includes('429')) {
                console.log("   ⏳ 속도 제한 감지! 60초간 대기합니다...");
                await sleep(60000);
            }
        }
    }
    console.log("\n🎊 모든 에셋 제작이 완료되었습니다!");
}

run().catch(console.error);
