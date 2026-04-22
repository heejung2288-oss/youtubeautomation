import os
import json
import requests
import time
import subprocess
from datetime import datetime
import google.generativeai as genai

# 제공해주신 실제 키 적용
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")

genai.configure(api_key=GEMINI_API_KEY)

def step1_search_trends():
    print("🚀 1단계: Gemini 2.0을 통해 최신 한국 건강 트렌드 검색 중...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    prompt = """
    검색을 통해 오늘 시점(2026년 4월) 대한민국에서 가장 화제인 50대 이상을 위한 건강 상식 트렌드 1가지를 선정해줘.
    그리고 그 주제로 5개의 장면으로 구성된 유튜브 쇼츠 대본을 작성해줘.
    응답은 반드시 아래 JSON 형식으로만 해:
    [
      {"scene": 1, "script": "짧은 대본(한국어)", "image_prompt": "Cinematic 9:16 high-quality image prompt (English)"},
      ...5개
    ]
    """
    response = model.generate_content(prompt)
    try:
        # JSON 부분만 추출
        clean_text = response.text.split('```json')[-1].split('```')[0].strip()
        plan = json.loads(clean_text)
        with open('plan.json', 'w', encoding='utf-8') as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        return plan
    except Exception as e:
        print(f"❌ JSON 파싱 에러: {e}")
        return None

def step2_3_generate_assets(plan):
    if not plan: return
    print(f"🎬 2-3단계: {len(plan)}개 장면에 대한 이미지 및 영상 생성 시작...")
    
    if not os.path.exists('asset/videos'): os.makedirs('asset/videos')
    
    for item in plan:
        scene_num = item['scene']
        img_prompt = item['image_prompt']
        
        print(f"--- Scene {scene_num} 처리 중...")
        
        # 1. Image Generation (Flux Schnell)
        img_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "130fdec2-7f99-4d64-9f20-9a25032a106f",
                "input": {"prompt": img_prompt, "aspect_ratio": "9:16"}
            }
        ).json()
        
        # Polling (간소화)
        time.sleep(10)
        img_url = requests.get(img_res['urls']['get'], headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}).json()['output'][0]
        
        # 2. Video Generation (Luma Dream Machine)
        vid_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "luma/dream-machine",
                "input": {"image": img_url, "prompt": "Fluid cinematic movement, 4k"}
            }
        ).json()
        
        # 실제 환경에서는 여기서 루프를 돌며 완료 대기 후 다운로드함
        print(f" ✅ Scene {scene_num} 큐 등록 완료 (예정 URL: {vid_res['urls']['get']})")

if __name__ == "__main__":
    plan = step1_search_trends()
    if plan:
        # step2_3_generate_assets(plan)
        print("\n✨ 기획이 완료되었습니다! plan.json을 확인해 보세요.")
        print("현재 Step 2-3는 API 비용과 시간을 고려하여 실행 대기 중입니다. 'Continue'라고 말씀하시면 바로 생성을 시작합니다.")
