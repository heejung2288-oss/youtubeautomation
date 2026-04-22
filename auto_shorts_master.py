import os
import json
import requests
import time
from datetime import datetime
import google.generativeai as genai

# API 설정 (GitHub Secrets에서 가져올 예정)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSy...") # 여기에 키를 입력하거나 Secrets에 설정
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "r8_3Ss...") # 사용자님의 토큰

genai.configure(api_key=GEMINI_API_KEY)

def step1_search_and_plan():
    print("🚀 1단계: 최신 건강 트렌드 분석 및 기획 중...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    prompt = """
    검색을 통해 오늘 가장 핫한 50대 건강 트렌드 1가지를 선정하고, 
    유튜브 쇼츠용 5장면 대본을 작성해줘. 
    결과는 반드시 아래 JSON 형식으로만 응답해:
    [
      {"scene": 1, "script": "대본 내용", "image_prompt": "이미지 생성을 위한 영어 프롬프트 (9:16 cinematic)"},
      ... 총 5번까지
    ]
    """
    response = model.generate_content(prompt)
    plan_data = json.loads(response.text.replace('```json', '').replace('```', ''))
    
    with open('plan.json', 'w', encoding='utf-8') as f:
        json.dump(plan_data, f, ensure_ascii=False, indent=2)
    return plan_data

def step2_generate_images(plan):
    print("🖼️ 2단계: 이미지 생성 중...")
    if not os.path.exists('asset/images'):
        os.makedirs('asset/images')
        
    for scene in plan:
        scene_num = scene['scene']
        prompt = scene['image_prompt']
        print(f" - Scene {scene_num} 이미지 생성 중...")
        
        # Replicate를 이용한 고화질 이미지 생성 (Flux 모델 등)
        response = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "130fdec2-7f99-4d64-9f20-9a25032a106f", # Flux Schnell
                "input": {"prompt": prompt, "aspect_ratio": "9:16"}
            }
        ).json()
        
        # 다운로드 대기 및 저장 (간략화)
        # 실제 구현시 polling 필요
        time.sleep(5) 

def step3_generate_videos():
    print("🎬 3단계: 이미지-투-비디오 생성 중...")
    # 이전 작업에서 완성한 generate_videos_api.js 로직을 파이썬으로 이식
    # Luma Dream Machine 활용
    pass

def step4_finalize_video():
    print("🎞️ 4단계: FFmpeg 최종 합성 중...")
    # ffmpeg -f concat -i list.txt -c copy final_shorts.mp4
    # 배경음악 삽입 로직 추가
    pass

if __name__ == "__main__":
    plan = step1_search_and_plan()
    step2_generate_images(plan)
    # step3, 4 순차 호출
