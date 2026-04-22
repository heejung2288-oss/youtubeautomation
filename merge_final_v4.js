const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG_PATH = `"C:\\Program Files (x86)\\youplayer\\ffmpeg.exe"`;
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');
const OUTPUT_FILE = 'final_shorts_v4.mp4';
const BGM_PATH = path.join(__dirname, 'asset', 'bgm', 'health_bgm.mp3');

async function merge() {
    console.log("🎞️ [Merge] 고화질 쇼츠 합성 시작...");
    
    // 1. 영상 목록 확인 (Scene_1.mp4 ~ Scene_5.mp4)
    const videos = [
        path.join(VIDEO_DIR, 'Scene_1.mp4'),
        path.join(VIDEO_DIR, 'Scene_2.mp4'),
        path.join(VIDEO_DIR, 'Scene_3.mp4'),
        path.join(VIDEO_DIR, 'Scene_4.mp4'),
        path.join(VIDEO_DIR, 'Scene_5.mp4')
    ];

    // 2. 임시 파일 리스트 생성
    let concatList = "";
    videos.forEach(v => {
        if (fs.existsSync(v)) {
            concatList += `file '${v.replace(/\\/g, '/')}'\n`;
        }
    });
    fs.writeFileSync('concat_list.txt', concatList);

    console.log("🔗 장면 연결 중...");
    
    // 3. FFmpeg 실행 (BGM이 있으면 믹싱, 없으면 비디오만)
    try {
        let cmd = "";
        if (fs.existsSync(BGM_PATH)) {
            console.log("🎵 배경음악 믹싱 중...");
            cmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i concat_list.txt -i "${BGM_PATH}" ` +
                  `-filter_complex "[0:v]format=yuv420p[v];[1:a]volume=0.4,afade=t=in:ss=0:d=2,afade=t=out:st=28:d=2[bgm]" ` +
                  `-map "[v]" -map "[bgm]" -c:v libx264 -preset fast -crf 23 -shortest ${OUTPUT_FILE}`;
        } else {
            console.log("⚠️ 배경음악 없음: 비디오만 병합합니다.");
            cmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i concat_list.txt -c:v libx264 -preset fast -crf 23 -an ${OUTPUT_FILE}`;
        }
        
        execSync(cmd);
        console.log(`✅ 최종 영상 생성 완료: ${OUTPUT_FILE}`);
    } catch (e) {
        console.error("❌ 합성 중 오류:", e.message);
    }
}

merge();
