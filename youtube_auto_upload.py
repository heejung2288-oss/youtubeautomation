import os
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from google.oauth2.credentials import Credentials

def upload_to_youtube(video_path, title, description):
    print(f"🎬 유튜브 업로드 시작: {video_path}")
    
    # GitHub Secrets에 저장된 토큰 정보로 인증 객체 생성
    creds = Credentials(
        token=None,
        refresh_token=os.getenv("YOUTUBE_REFRESH_TOKEN"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("YOUTUBE_CLIENT_ID"),
        client_secret=os.getenv("YOUTUBE_CLIENT_SECRET")
    )

    youtube = googleapiclient.discovery.build("youtube", "v3", credentials=creds)

    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "categoryId": "22", # People & Blogs
                "description": description,
                "title": title,
                "tags": ["건강", "50대", "건강상식", "Shorts"]
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False
            }
        },
        media_body=googleapiclient.http.MediaFileUpload(video_path, chunksize=-1, resumable=True)
    )
    
    response = request.execute()
    print(f"✅ 업로드 성공! 영상 ID: {response['id']}")

if __name__ == "__main__":
    upload_to_youtube("final_shorts.mp4", "오늘의 건강상식 시리즈", "매일 오전 10시 배달되는 건강 꿀팁!")
