try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    print("\n[에러] 필요한 라이브러리가 설치되어 있지 않습니다.")
    print("터미널에서 다음 명령어를 실행해주세요:")
    print("pip install selenium webdriver-manager")
    exit(1)

# 1. 경로 설정
BASE_DIR = r"c:\YHJ\Antigravity\auto\asset"
IMAGE_DIR = os.path.join(BASE_DIR, "images")
VIDEO_DIR = os.path.join(BASE_DIR, "videos")

# 폴더 생성 확인
os.makedirs(VIDEO_DIR, exist_ok=True)

# 크롬 옵션 설정
chrome_options = webdriver.ChromeOptions()
prefs = {"download.default_directory": VIDEO_DIR}
chrome_options.add_experimental_option("prefs", prefs)
chrome_options.add_experimental_option("detach", True) # 브라우저 자동 종료 방지

print("크롬 브라우저를 실행합니다...")
try:
    # Selenium 4 서비스 설정
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.maximize_window()
except Exception as e:
    print(f"브라우저 실행 중 오류 발생: {e}")
    exit(1)

try:
    # 2. VideoFX (Flow AI) 접속
    print("\n[접속] VideoFX Site로 이동합니다...")
    driver.get("https://videofx.google.com/")
    
    # 3. 로그인 및 준비 대기 (60초 - 수동 로그인 및 Flow 메뉴 진입 시간)
    print("----------------------------------------------------")
    print("🔔 중요: 브라우저에서 Google 로그인을 완료해주세요!")
    print("🔔 'Flow' 워크스페이스 또는 'Create' 화면으로 이동해주세요.")
    print("🔔 60초 후 자동화가 시작됩니다. (준비가 되면 터미널을 확인하세요)")
    print("----------------------------------------------------")
    time.sleep(40) # 로그인 및 로딩 대기

    for i in range(1, 6):
        image_name = f"scene_{i}.png"
        image_path = os.path.join(IMAGE_DIR, image_name)
        video_name = f"scene_{i}.mp4"
        
        if not os.path.exists(image_path):
            continue
            
        print(f"\n▶ [{image_name}] 처리 시작...")
        
        try:
            # [1] 모델 선택 (Veo 3.1-Lite)
            print("  - 'Veo 3.1-Lite' 모델 설정 확인 중...")
            # 모델 선택 버튼 클릭 (UI 구조에 따라 유동적)
            model_chips = driver.find_elements(By.XPATH, "//*[contains(text(), 'Veo') or contains(text(), 'Model')]")
            if model_chips:
                model_chips[0].click()
                time.sleep(2)
                lite_option = driver.find_elements(By.XPATH, "//*[contains(text(), '3.1-Lite')]")
                if lite_option:
                    lite_option[0].click()
            
            # [2] 이미지 업로드
            print("  - 이미지 업로드 시도 중...")
            upload_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
            upload_input.send_keys(image_path)
            time.sleep(5) # 업로드 대기
            
            # [3] 길이 설정 (5초)
            print("  - 동영상 길이를 5초로 설정합니다.")
            settings = driver.find_elements(By.XPATH, "//*[contains(text(), '5s') or contains(text(), 'Duration')]")
            if settings:
                settings[0].click()
            
            # [4] 생성 버튼 클릭 (Generate)
            print("  - 생성(Generate) 버튼 클릭!")
            gen_btn = driver.find_element(By.XPATH, "//button[contains(., 'Generate') or contains(., 'Run')]")
            gen_btn.click()
            
            # [5] 생성 완료 대기 (약 1~2분 소요)
            print("  - 비디오 생성 중... 최대 2분간 대기합니다.")
            # 성공 아이콘이나 다운로드 버튼이 나타날 때까지 대기
            wait = WebDriverWait(driver, 150)
            download_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Download')]")))
            
            # [6] 저장
            download_btn.click()
            print(f"✅ [{image_name}] 생성 및 다운로드 요청 완료!")
            time.sleep(5) # 다운로드 프로세스 대기
            
        except Exception as e:
            print(f"❌ '{image_name}' 처리 중 오류 발생: {e}")
            continue

    print("\n🎉 모든 작업이 완료되었습니다! asset/videos 폴더를 확인해 주세요.")

except Exception as e:
    print(f"실행 중 치명적 에러가 발생했습니다: {e}")

finally:
    print("\n최종 확인을 위해 브라우저를 닫지 않습니다.")
