const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`; // 따옴표 포함
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');
const TTS_DIR = path.join(__dirname, 'asset', 'tts');
const TEMP_DIR = path.join(__dirname, 'asset', 'temp');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function mergeVideos() {
    console.log('🎬 최종 영상 합성을 시작합니다...');

    try {
        const concatList = [];

        for (let i = 1; i <= 5; i++) {
            const videoPath = path.join(VIDEO_DIR, `Scene_${i}.mp4`);
            const ttsPath = path.join(TTS_DIR, `scene_${i}.mp3`);
            const tempOut = path.join(TEMP_DIR, `temp_${i}.mp4`);

            console.log(`--- Scene ${i} 처리 중...`);
            
            // 영상과 음성 결합 (음성 길이에 맞춰 영상 반복/정지 처리 없이 간단 결합)
            // -shortest 옵션으로 둘 중 짧은 쪽에 맞춤 (대부분 영상이 5초로 고정되었다고 가정)
            const cmd = `${FFMPEG_PATH} -y -i "${videoPath}" -i "${ttsPath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${tempOut}"`;
            execSync(cmd);
            
            concatList.push(`file '${tempOut.replace(/\\/g, '/')}'`);
        }

        // 합치기용 리스트 파일 생성
        const listFile = path.join(TEMP_DIR, 'list.txt');
        fs.writeFileSync(listFile, concatList.join('\n'));

        // 최종 병합
        console.log('--- 모든 장면 하나로 합치는 중...');
        const finalOutput = path.join(__dirname, 'final_shorts.mp4');
        const mergeCmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i "${listFile}" -c copy "${finalOutput}"`;
        execSync(mergeCmd);

        console.log(`\n🎉 축하합니다! 최종 영상이 생성되었습니다: ${finalOutput}`);
    } catch (error) {
        console.error('❌ 합성 중 에러 발생:', error.message);
    }
}

mergeVideos();
