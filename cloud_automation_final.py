import os
import json
import requests
import time
import subprocess
from datetime import datetime
from google.cloud import storage
import google.generativeai as genai
import googleapiclient.discovery
import googleapiclient.http
from google.oauth2.credentials import Credentials

# --- [설정 및 API 키] ---
# 가급적 환경 변수(GitHub Secrets 또는 Cloud Run Env)로 관리하세요
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")
YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REFRESH_TOKEN = os.environ.get("YOUTUBE_REFRESH_TOKEN")

# GCS 버킷 이름 (본인의 프로젝트 ID에 맞춰 자동 설정하거나 직접 입력)
BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME", "pension-5fbb5.firebasestorage.app")

genai.configure(api_key=GEMINI_API_KEY)
storage_client = storage.Client()
bucket = storage_client.bucket(BUCKET_NAME)

def upload_to_gcs(local_path, cloud_path):
    """로컬 파일을 GCS에 업로드합니다."""
    blob = bucket.blob(cloud_path)
    blob.upload_from_filename(local_path)
    print(f"☁️ [GCS] 업로드 완료: {cloud_path}")
    return f"gs://{BUCKET_NAME}/{cloud_path}"

def download_from_gcs(cloud_path, local_path):
    """GCS 파일을 로컬(임시)로 다운로드합니다."""
    blob = bucket.blob(cloud_path)
    blob.download_to_filename(local_path)
    print(f"☁️ [GCS] 다운로드 완료: {local_path}")

# --- [Phase 1: 기획 및 GCS 저장] ---
def step1_search_trends():
    print("🚀 1단계: Gemini를 통해 한국 건강 트렌드 검색 및 기획...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    prompt = """
    대한민국 건강 트렌드(50대 타겟)를 선정하고 유투브 쇼츠 5장면 대본을 JSON으로 작성해줘.
    형식: [{"scene": 1, "script": "...", "image_prompt": "..."}]
    """
    response = model.generate_content(prompt)
    clean_text = response.text.split('```json')[-1].split('```')[0].strip()
    plan = json.loads(clean_text)
    
    # GCS에 기획안 저장
    blob = bucket.blob("current_run/plan.json")
    blob.upload_from_string(json.dumps(plan, ensure_ascii=False, indent=2))
    print("✅ 기획안 GCS 저장 완료 (current_run/plan.json)")
    return plan

# --- [Phase 2-3: 에셋 생성 및 GCS 싱크] ---
def step2_generate_assets(plan):
    print("🎬 2단계: 에셋(이미지/영상) 생성 및 GCS 저장...")
    temp_dir = "/tmp/assets" # Cloud Run/Functions의 임시 디렉토리
    if not os.path.exists(temp_dir): os.makedirs(temp_dir)
    
    fragments = []
    for item in plan:
        scene_num = item['scene']
        print(f"--- Scene {scene_num} 생성 중 ---")
        
        # 1. 이미지 생성 (Replicate)
        img_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "130fdec2-7f99-4d64-9f20-9a25032a106f", # Flux
                "input": {"prompt": item['image_prompt'], "aspect_ratio": "9:16"}
            }
        ).json()
        
        time.sleep(15) # 생성 대기 (간소화)
        img_status = requests.get(img_res['urls']['get'], headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}).json()
        img_url = img_status['output'][0]
        
        # 2. 영상 생성 (Replicate - Luma)
        vid_res = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"},
            json={
                "version": "luma/dream-machine",
                "input": {"image": img_url, "prompt": "Cinematic movement, 4k"}
            }
        ).json()
        
        # 실제 환경에서는 루프 대기 필요하겠으나, 60초 대기 후 시도
        time.sleep(60) 
        vid_status = requests.get(vid_res['urls']['get'], headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}).json()
        if vid_status['status'] == 'succeeded':
            vid_url = vid_status['output']
            # GCS로 직접 저장은 불가능하므로 /tmp에 다운로드 후 업로드
            local_vid = f"{temp_dir}/scene_{scene_num}.mp4"
            with open(local_vid, 'wb') as f:
                f.write(requests.get(vid_url).content)
            
            cloud_path = f"current_run/videos/scene_{scene_num}.mp4"
            upload_to_gcs(local_vid, cloud_path)
            fragments.append(cloud_path)
            
    return fragments

# --- [Phase 4: GCS 파일 병합 (Cloud ffmpeg)] ---
def step3_merge_videos(cloud_paths):
    print("🎥 3단계: GCS 파일 다운로드 및 ffmpeg 병합...")
    temp_dir = "/tmp/merge"
    if not os.path.exists(temp_dir): os.makedirs(temp_dir)
    
    with open(f"{temp_dir}/list.txt", 'w') as f:
        for i, cp in enumerate(cloud_paths):
            local_part = f"{temp_dir}/p_{i}.mp4"
            download_from_gcs(cp, local_part)
            f.write(f"file '{local_part}'\n")
            
    output_path = f"{temp_dir}/final_shorts.mp4"
    # ffmpeg 실행 (Cloud Run 환경에 ffmpeg가 설치되어 있어야 함)
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"{temp_dir}/list.txt", "-c", "copy", output_path]
    subprocess.run(cmd, check=True)
    
    upload_to_gcs(output_path, "current_run/final/final_shorts.mp4")
    return output_path

# --- [Phase 5: 유튜브 클라우드 업로드] ---
def step4_youtube_upload(video_path):
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
            "snippet": {"title": "오늘의 건강상식", "description": "구글 클라우드에서 생성된 자동화 영상입니다.", "categoryId": "22"},
            "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False}
        },
        media_body=googleapiclient.http.MediaFileUpload(video_path, chunksize=-1, resumable=True)
    )
    response = request.execute()
    print(f"🎉 클라우드 업로드 성공! 영상 ID: {response['id']}")

if __name__ == "__main__":
    plan = step1_search_trends()
    fragments = step2_generate_assets(plan)
    final_video = step3_merge_videos(fragments)
    step4_youtube_upload(final_video)
