import json
import os
from gtts import gTTS

def generate_tts():
    # 폴더 생성
    if not os.path.exists('asset/tts'):
        os.makedirs('asset/tts')
        
    # plan.json 읽기
    with open('plan.json', 'r', encoding='utf-8') as f:
        scenes = json.load(f)
        
    for scene in scenes:
        num = scene['scene']
        script = scene['script']
        output_path = f'asset/tts/scene_{num}.mp3'
        
        print(f"Generating TTS for Scene {num}...")
        tts = gTTS(text=script, lang='ko')
        tts.save(output_path)
        print(f"Saved: {output_path}")

if __name__ == "__main__":
    try:
        generate_tts()
    except Exception as e:
        print(f"Error: {e}")
