import os
import json
import requests
import time
import subprocess
from datetime import datetime
import google.generativeai as genai

# API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

genai.configure(api_key=GEMINI_API_KEY)

def poll_prediction(prediction_url):
    print("   - 생성 완료 대기 중...")
    while True:
        res = requests.get(
            prediction_url,
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}
        ).json()
        if res['status'] == 'succeeded':
            return res['output']
        if res['status'] == 'failed':
            raise Exception("생성 실패")
        time.sleep(10)

def step1_to_3():
    print("🚀 1-3단계: 기획, 이미지, 영상 생성 시작")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    prompt = "오늘의 한국 건강 트렌드 1개를 골라 5장면 쇼츠 대본(JSON)을 작성해줘. 한국어로 대본을, 영어로 이미지 프롬프트를 작성해."
    # ... 이전 로직과 동일하게 JSON 추출 ...
    
    # 예시 계획서 (실제는 Gemini 결과 사용)
    plan = [
        {"scene": 1, "image_prompt": "Healthy Korean person, 9:16 cinematic"}
        # ... 5개
    ]

    for scene in plan:
        # 이미지 생성 (Flux)
        # 영상 생성 (Luma Dream Machine)
        # 각각 다운로드
        pass

def step4_ffmpeg_combine():
    print("🎞️ 4단계: FFmpeg 최종 합성 중...")
    # 9:16 세로 영상들을 하나로 합치고 배경음악을 입히는 명령어
    # ffmpeg 호환성을 위해 리스트 파일 생성 후 처리
    with open('concat_list.txt', 'w') as f:
        for i in range(1, 6):
            f.write(f"file 'asset/videos/scene_{i}.mp4'\n")
    
    cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', 'concat_list.txt',
        '-i', 'asset/bgm/default_bgm.mp3', '-filter_complex', '[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]',
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-shortest', 'final_shorts.mp4'
    ]
    subprocess.run(cmd)
    print("🎉 합성 완료: final_shorts.mp4")

if __name__ == "__main__":
    # step1_to_3()
    # step4_ffmpeg_combine()
    pass
