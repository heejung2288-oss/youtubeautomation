import os
import json
import requests
import time
import subprocess
from datetime import datetime
import google.generativeai as genai
import googleapiclient.discovery
import googleapiclient.http
from google.oauth2.credentials import Credentials

# --- [설정 및 API 키] ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")
YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN")

genai.configure(api_key=GEMINI_API_KEY)

# --- [Phase 1: 기획 및 로컬 저장] ---
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
        clean_text = response.text.split('```json')[-1].split('```')[0].strip()
        plan = json.loads(clean_text)
        with open('plan.json', 'w', encoding='utf-8') as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        print("✅ 기획 완료: plan.json 저장됨.")
        return plan
    except Exception as e:
        print(f"❌ JSON 파싱 에러: {e}")
        return None

# --- [Phase 2-3: 에셋 생성 및 로컬 저장] ---
def step2_generate_assets(plan):
    if not plan: return []
    print(f"🎬 2-3단계: {len(plan)}개 장면에 대한 이미지 및 영상 생성 시작...")
    
    asset_dir = 'asset/videos'
    if not os.path.exists(asset_dir): os.makedirs(asset_dir)
    
    local_paths = []
    for item in plan:
        scene_num = item['scene']
        img_prompt = item['image_prompt']
        print(f"--- Scene {scene_num} 처리 중...")
        
        # 1. Image Generation (Flux)
        img_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "130fdec2-7f99-4d64-9f20-9a25032a106f",
                "input": {"prompt": img_prompt, "aspect_ratio": "9:16"}
            }
        ).json()
        
        while True:
            time.sleep(3)
            status = requests.get(img_res['urls']['get'], headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}).json()
            if status['status'] == 'succeeded':
                img_url = status['output'][0]
                break
            elif status['status'] == 'failed':
                print("❌ 이미지 생성 실패")
                return []

        # 2. Video Generation (Luma)
        vid_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "luma/dream-machine",
                "input": {"image": img_url, "prompt": "Fluid cinematic movement, 4k"}
            }
        ).json()
        
        while True:
            time.sleep(10)
            status = requests.get(vid_res['urls']['get'], headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}).json()
            if status['status'] == 'succeeded':
                vid_url = status['output']
                break
            elif status['status'] == 'failed':
                print("❌ 영상 생성 실패")
                return []
            print(f"   ...상태: {status['status']}")

        # 3. 다운로드
        video_path = os.path.join(asset_dir, f"scene_{scene_num}.mp4")
        with open(video_path, 'wb') as f:
            f.write(requests.get(vid_url).content)
        
        print(f" ✅ Scene {scene_num} 저장 완료: {video_path}")
        local_paths.append(video_path)
        
    return local_paths

# --- [Phase 4: 로컬 파일 병합 (ffmpeg)] ---
def step3_merge_videos(video_paths):
    if not video_paths: return None
    print("🎥 3단계: 로컬 파일 ffmpeg 병합 시작...")
    
    list_file = 'concat_list.txt'
    with open(list_file, 'w') as f:
        for path in video_paths:
            # 상대 경로 또는 절대 경로 문제 방지를 위해 정리
            f.write(f"file '{os.path.abspath(path)}'\n")
            
    output_path = "final_shorts.mp4"
    # ffmpeg 실행
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", output_path]
    subprocess.run(cmd, check=True)
    
    print(f"✅ 최종 영상 생성 완료: {output_path}")
    return output_path

# --- [Phase 5: 유튜브 자동 업로드] ---
def step4_youtube_upload(video_path):
    if not video_path or not os.path.exists(video_path): return
    print("📺 4단계: 유튜브 자동 업로드 시작...")
    
    creds = Credentials(
        token=None,
        refresh_token=YOUTUBE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=YOUTUBE_CLIENT_ID,
        client_secret=YOUTUBE_CLIENT_SECRET
    )
    youtube = googleapiclient.discovery.build("youtube", "v3", credentials=creds)
    
    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": "오늘의 건강상식 - PC 자동화",
                "description": "PC 로컬 환경에서 자동으로 생성된 건강 꿀팁입니다.",
                "categoryId": "22"
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False
            }
        },
        media_body=googleapiclient.http.MediaFileUpload(video_path, chunksize=-1, resumable=True)
    )
    response = request.execute()
    print(f"🎉 업로드 성공! 영상 ID: {response['id']}")

if __name__ == "__main__":
    plan = step1_search_trends()
    if plan:
        # 이 단계부터는 실제 API 비용이 발생합니다.
        # 실행을 원하시면 아래 주석을 해제하세요.
        # video_fragments = step2_generate_assets(plan)
        # if video_fragments:
        #    final_video = step3_merge_videos(video_fragments)
        #    step4_youtube_upload(final_video)
        print("\n✨ 기획이 완료되었습니다! 실제 합성과 업로드를 진행하려면 메인 함수의 주석을 해제해 주세요.")
