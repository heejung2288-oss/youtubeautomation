const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, 'asset', 'images');
const VIDEO_DIR = path.join(__dirname, 'asset', 'videos');
const PROJECT_URL = "https://labs.google/fx/ko/tools/flow/project/b7522d45-57ae-4c76-9249-b1baa7409add001e";

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function run() {
    console.log("🚀 VideoFX (Flow AI) 초강력 자동화를 시작합니다.");
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const [page] = await browser.pages();
    
    try {
        await page.goto(PROJECT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("---------------------------------------------------------");
        console.log("🔔 로그인이 완료되면 자동으로 작업을 진행합니다. (20초 대기)");
        console.log("---------------------------------------------------------");
        await new Promise(r => setTimeout(r, 20000));

        for (let i = 1; i <= 5; i++) {
            const imageName = `scene_${i}.png`;
            const imagePath = path.join(IMAGE_DIR, imageName);

            if (!fs.existsSync(imagePath)) continue;

            console.log(`\n▶ [${imageName}] 작업 시작...`);

            // 1. 모든 요소 속에서 업로드 버튼 강제 탐색
            console.log("  - 시스템 내 업로드 인터페이스 탐색 중...");
            const uploadHandle = await page.evaluateHandle(() => {
                const findUpload = (root) => {
                    const elements = root.querySelectorAll('button, div[role="button"], input[type="file"]');
                    for (let el of elements) {
                        const text = (el.innerText || "").toLowerCase();
                        const label = (el.getAttribute('aria-label') || "").toLowerCase();
                        if (text.includes("추가") || text.includes("미디어") || text.includes("upload") || label.includes("add") || label.includes("media")) {
                            return el;
                        }
                    }
                    return null;
                };
                return findUpload(document);
            });

            if (!uploadHandle.asElement()) {
                console.log("⚠️ 버튼을 찾지 못해 기본 파일 입력을 직접 사용합니다.");
            }

            const [fileChooser] = await Promise.all([
                page.waitForFileChooser(),
                page.evaluate((el) => {
                    if (el) el.click();
                    else document.querySelector('input[type="file"]')?.click();
                }, uploadHandle)
            ]);
            
            await fileChooser.accept([imagePath]);
            await new Promise(r => setTimeout(r, 6000));

            // 2. 만들기 버튼 클릭
            console.log("  - '만들기' 버튼 탐색 및 클릭...");
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const genBtn = btns.find(b => b.innerText.includes("만들기") || b.innerText.includes("Generate"));
                if (genBtn) genBtn.click();
            });

            // 3. 다운로드 버튼 대기 및 클릭
            console.log("  - 영상 생성 완료 대기 중 (최대 3분)...");
            await page.waitForFunction(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.some(b => b.innerText.includes("다운로드") || b.getAttribute('aria-label')?.includes("Download"));
            }, { timeout: 200000 });

            // 다운로드 실행
            console.log("  - 영상 다운로드 중...");
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: VIDEO_DIR });

            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const dlBtn = btns.find(b => b.innerText.includes("다운로드") || b.getAttribute('aria-label')?.includes("Download"));
                if (dlBtn) dlBtn.click();
            });

            console.log(`✅ [${imageName}] 생성 및 저장 완료!`);
            await new Promise(r => setTimeout(r, 5000));
        }

    } catch (err) {
        console.error("❌ 오류 발생:", err);
    } finally {
        console.log("\n모든 작업이 완료되었습니다.");
    }
}

run();
