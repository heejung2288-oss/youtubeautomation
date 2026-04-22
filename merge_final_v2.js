const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');
const TTS_DIR = path.join(__dirname, 'asset', 'tts');
const TEMP_DIR = path.join(__dirname, 'asset', 'temp');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function mergeVideos() {
    console.log('🚀 [업그레이드 모드] 영상 루프 및 음성 싱크 합성을 시작합니다...');

    try {
        const concatList = [];

        for (let i = 1; i <= 5; i++) {
            const videoPath = path.join(VIDEO_DIR, `Scene_${i}.mp4`);
            const ttsPath = path.join(TTS_DIR, `scene_${i}.mp3`);
            const tempOut = path.join(TEMP_DIR, `temp_${i}.mp4`);

            console.log(`--- Scene ${i} 처리 중 (음성 길이에 맞춰 반복)...`);
            
            // 핵심: -stream_loop -1 (무한루프)와 -shortest (음성 길이에 맞춰 종료)를 결합
            // 음성이 영상보다 길면 영상이 반복되고, 짧으면 음성 끝에서 잘립니다.
            const cmd = `${FFMPEG_PATH} -y -stream_loop -1 -i "${videoPath}" -i "${ttsPath}" -map 0:v -map 1:a -c:v libx264 -preset fast -c:a aac -shortest "${tempOut}"`;
            execSync(cmd);
            
            concatList.push(`file '${tempOut.replace(/\\/g, '/')}'`);
        }

        const listFile = path.join(TEMP_DIR, 'list.txt');
        fs.writeFileSync(listFile, concatList.join('\n'));

        console.log('--- 최종본 이어붙이기 중...');
        const finalOutput = path.join(__dirname, 'final_shorts_v2.mp4');
        const mergeCmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i "${listFile}" -c copy "${finalOutput}"`;
        execSync(mergeCmd);

        console.log(`\n🎉 완성! 소리가 잘리지 않는 최종본: ${finalOutput}`);
    } catch (error) {
        console.error('❌ 합성 실패:', error.message);
    }
}

mergeVideos();
