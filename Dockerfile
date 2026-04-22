# Python 3.9 슬림 이미지 기반
FROM python:3.9-slim

# ffmpeg 설치
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# 종속성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 소스 복사
COPY . .

# 실행 명령
CMD ["python", "cloud_automation_final.py"]
