const Replicate = require("replicate");
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const replicate = new Replicate({ auth: API_TOKEN });
const IMAGE_DIR = path.join(__dirname, 'asset', 'images');
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function run() {
    console.log("🚀 [인내심 모드] Replicate 영상 생성을 시작합니다. 느리지만 확실하게 진행합니다.");
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (let i = 1; i <= 5; i++) {
        const imageName = `scene_${i}.png`;
        const videoName = `scene_${i}.mp4`;
        const imagePath = path.join(IMAGE_DIR, imageName);
        const videoPath = path.join(VIDEO_DIR, videoName);

        if (!fs.existsSync(imagePath)) continue;
        if (fs.existsSync(videoPath)) {
            console.log(`✅ [${videoName}] 는 이미 완성되어 있습니다. 다음으로 넘어갑니다.`);
            continue;
        }

        let retries = 5;
        let success = false;

        while (retries > 0 && !success) {
            console.log(`\n▶ [${imageName}] 시도 중... (남은 재시도: ${retries})`);
            console.log("  - 안전을 위해 20초간 대기합니다...");
            await sleep(20000);

            try {
                const imageData = fs.readFileSync(imagePath).toString("base64");
                const input = {
                    prompt: "A high-quality cinematic 5-second video based on this image, 4k resolution, fluid motion",
                    image: `data:image/png;base64,${imageData}`
                };

                const output = await replicate.run("luma/dream-machine", { input });

                console.log("  - 서버 처리 완료! 파일 다운로드 시작...");
                const response = await axios({ url: output, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(videoPath);
                response.data.pipe(writer);
                await new Promise((resolve) => writer.on('finish', resolve));

                console.log(`🎉 [${videoName}] 저장 성공!`);
                success = true;
            } catch (error) {
                console.error(`❌ 에러 발생: ${error.message}`);
                if (error.message.includes('429')) {
                    console.log("⚠️ 속도 제한 발생! 30초 후 다시 시도합니다...");
                    await sleep(30000);
                    retries--;
                } else {
                    console.log("⚠️ 알 수 없는 에러입니다. 10초 후 다시 시도합니다...");
                    await sleep(10000);
                    retries--;
                }
            }
        }

        if (!success) {
            console.log(`😭 [${imageName}] 생성에 최종 실패했습니다. 다음으로 넘어갑니다.`);
        }
    }
    console.log("\n모든 작업이 완료되었습니다! asset/videos 폴더를 확인해 주세요.");
}

run();
