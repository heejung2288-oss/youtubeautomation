const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');
const TTS_DIR = path.join(__dirname, 'asset', 'tts');
const TEMP_DIR = path.join(__dirname, 'asset', 'temp');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function mergeVideos() {
    console.log('🔄 [안정화 모드] 합성을 재시도합니다...');

    try {
        const concatList = [];

        for (let i = 1; i <= 5; i++) {
            const videoPath = path.join(VIDEO_DIR, `Scene_${i}.mp4`);
            const ttsPath = path.join(TTS_DIR, `scene_${i}.mp3`);
            const tempOut = path.join(TEMP_DIR, `temp_${i}.mp4`);

            console.log(`--- Scene ${i} 인코딩 중...`);
            
            // 단순하고 확실한 명령어로 변경
            const cmd = `${FFMPEG_PATH} -y -stream_loop -1 -i "${videoPath}" -i "${ttsPath}" -c:v libx264 -c:a aac -b:a 192k -shortest "${tempOut}"`;
            execSync(cmd);
            
            concatList.push(`file '${tempOut.replace(/\\/g, '/')}'`);
        }

        const listFile = path.join(TEMP_DIR, 'list.txt');
        fs.writeFileSync(listFile, concatList.join('\n'));

        console.log('--- 최종 병합 중...');
        const finalOutput = path.join(__dirname, 'final_shorts_v3.mp4');
        const mergeCmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i "${listFile}" -c copy "${finalOutput}"`;
        execSync(mergeCmd);

        console.log(`\n🎉 최종 완료: ${finalOutput}`);
    } catch (error) {
        console.error('❌ 다시 실패했습니다:', error.message);
    }
}

mergeVideos();
