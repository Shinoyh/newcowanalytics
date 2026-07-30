import os
import sys
import json
import subprocess
import time
from google import genai
from google.genai import types
import argparse
import base64

def get_cookies_file():
    paths = [
        "cookies.txt",
        "../cookies.txt",
        "/etc/secrets/cookies.txt"
    ]
    for path in paths:
        if os.path.exists(path):
            return path
    return None

def download_short_video(video_id):
    # Download full video for shorts
    out_file = f"{video_id}_short.mp4"
    if not os.path.exists(out_file):
        cmd = [
            "yt-dlp", 
            "--no-warnings",
            "-f", "bestvideo+bestaudio/best",
            "--merge-output-format", "mp4",
            f"https://www.youtube.com/watch?v={video_id}",
            "-o", out_file
        ]
        cookies = get_cookies_file()
        if cookies:
            cmd.extend(["--cookies", cookies])
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise Exception(f"yt-dlp failed: {e.stderr}")
    return out_file

def download_long_video_assets(video_id):
    # Download intro video (first 2 minutes)
    intro_file = f"{video_id}_intro.mp4"
    if not os.path.exists(intro_file):
        cmd_intro = [
            "yt-dlp",
            "--no-warnings",
            "-f", "bestvideo+bestaudio/best",
            "--download-sections", "*00:00:00-00:02:00",
            "--merge-output-format", "mp4",
            f"https://www.youtube.com/watch?v={video_id}",
            "-o", intro_file
        ]
        cookies = get_cookies_file()
        if cookies:
            cmd_intro.extend(["--cookies", cookies])
        try:
            subprocess.run(cmd_intro, check=True, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise Exception(f"yt-dlp intro download failed: {e.stderr}")
        
    # Download full audio
    audio_file = f"{video_id}_full.mp3"
    if not os.path.exists(audio_file):
        cmd_audio = [
            "yt-dlp",
            "--no-warnings",
            "-f", "bestaudio/best",
            "-x", "--audio-format", "mp3",
            f"https://www.youtube.com/watch?v={video_id}",
            "-o", audio_file
        ]
        cookies = get_cookies_file()
        if cookies:
            cmd_audio.extend(["--cookies", cookies])
        try:
            subprocess.run(cmd_audio, check=True, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise Exception(f"yt-dlp audio download failed: {e.stderr}")
            
    return intro_file, audio_file

def wait_for_files_active(client, files):
    for f in files:
        while f.state.name == 'PROCESSING':
            time.sleep(2)
            f = client.files.get(name=f.name)
        if f.state.name == 'FAILED':
            raise Exception("File processing failed")

def analyze_video(api_key, video_id, video_type, metadata_json_str, step):
    client = genai.Client(api_key=api_key)
    
    config = types.GenerateContentConfig(
        system_instruction="""You are an expert Video Content Analyst and Viral Marketing Strategist. Your task is to analyze the provided video (or video transcript and visual sequence) and evaluate its retention potential, hooking mechanisms, and viral capability based on specific criteria.
Analyze the content thoroughly and output your analysis strictly in JSON format matching the schema provided below. Do not include any introductory or concluding text outside the JSON object.

### CRITICAL INSTRUCTION ON IDENTITY ###
If the person in the video is a globally or nationally recognized public figure, you may use their name. However, you MUST cross-check this with the video title or channel name in the metadata. If there is no mention of the celebrity in the metadata, or if you have even the slightest doubt about their identity, DO NOT guess specific names. Instead, refer to them using neutral terms such as '출연자' (performer), '유튜버' (creator), or '여성/남성' (woman/man).

### LANGUAGE REQUIREMENT ###
CRITICAL: All string values, descriptions, summaries, and feedback inside the JSON object MUST be written in fluent and natural Korean. The JSON keys must remain in English.
IMPORTANT: If you use double quotes inside a string value, you MUST escape them properly like this: \\" to prevent JSON parsing errors.

### OUTPUT JSON SCHEMA ###
{
  "summary_and_keywords": {
    "three_line_summary": [
      "영상 핵심 요약 1 (한국어)",
      "영상 핵심 요약 2 (한국어)",
      "영상 핵심 요약 3 (한국어)"
    ],
    "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
  },
  "hooking_analysis": {
    "hook_score": 85,
    "primary_hook_type": "시각적 후킹 / 청각적 후킹 / 서사적 후킹 등 (한국어)",
    "breakdown": {
      "visual_hook": "초반 3-5초의 시각적 요소 및 연출에 대한 분석 (한국어)",
      "audio_hook": "첫 마디, 톤, 효과음, 배경음악에 대한 분석 (한국어)",
      "text_hook": "초반 텍스트, 자막, 타이틀 구성에 대한 분석 (한국어)"
    }
  },
  "emotional_triggers": [
    {
      "emotion": "호기심 / 유머 / 실질적 이득 / 공감 등 자극되는 감정 (한국어)",
      "percentage": 40,
      "reason": "해당 감정이 자극되는 영상 내 구체적인 이유나 장면 (한국어)"
    }
  ],
  "viral_score": 88,
  "improvement_feedback": [
    "시청 유지율이나 흥행 확률을 높이기 위한 구체적인 개선 제안 1 (한국어)",
    "구체적인 개선 제안 2 (한국어)"
  ]
}""",
        temperature=0.7,
        response_mime_type="application/json",
    )
    
    prompt = f"Here is the metadata for the video:\n{metadata_json_str}\n\n"
    uploaded_files = []

    try:
        if step == "download" or step == "all":
            if video_type.upper() == "SHORT":
                download_short_video(video_id)
            else:
                download_long_video_assets(video_id)
                
            if step == "download":
                print(json.dumps({"status": "downloaded"}))
                return

        if step == "analyze" or step == "all":
            if video_type.upper() == "SHORT":
                vid_file = f"{video_id}_short.mp4"
                if not os.path.exists(vid_file):
                    raise Exception(f"File {vid_file} not found. Did download step run?")
                print(f"Uploading {vid_file}...", file=sys.stderr)
                gemini_file = client.files.upload(file=vid_file)
                uploaded_files.append(gemini_file)
                wait_for_files_active(client, uploaded_files)
                prompt += "Please analyze the attached short-form video in its entirety."
                response = client.models.generate_content(model='gemini-3.5-flash', contents=[uploaded_files[0], prompt], config=config)
            else:
                intro_file = f"{video_id}_intro.mp4"
                audio_file = f"{video_id}_full.mp3"
                if not os.path.exists(intro_file) or not os.path.exists(audio_file):
                    raise Exception("Intro or audio files not found. Did download step run?")
                print(f"Uploading {intro_file} and {audio_file}...", file=sys.stderr)
                gemini_intro = client.files.upload(file=intro_file)
                gemini_audio = client.files.upload(file=audio_file)
                uploaded_files.extend([gemini_intro, gemini_audio])
                wait_for_files_active(client, uploaded_files)
                prompt += "Please analyze the attached video. The first file is the first 2 minutes of the video (intro). The second file is the audio track for the entire 30+ minute video. Use the intro video to analyze the visual hook, and the full audio to understand the complete context and storyline."
                response = client.models.generate_content(model='gemini-3.5-flash', contents=[uploaded_files[0], uploaded_files[1], prompt], config=config)

            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            print(clean_json)
        
    finally:
        # Cleanup uploaded files from Gemini
        for f in uploaded_files:
            try:
                client.files.delete(name=f.name)
            except Exception as e:
                print(f"Failed to delete {f.name}: {e}", file=sys.stderr)
                
        # Cleanup local files ONLY during 'analyze' or 'all', not 'download'
        if step == "analyze" or step == "all":
            if video_type.upper() == "SHORT":
                if os.path.exists(f"{video_id}_short.mp4"): os.remove(f"{video_id}_short.mp4")
            else:
                if os.path.exists(f"{video_id}_intro.mp4"): os.remove(f"{video_id}_intro.mp4")
                if os.path.exists(f"{video_id}_full.mp3"): os.remove(f"{video_id}_full.mp3")

def analyze_channel(api_key, metadata_json_str):
    client = genai.Client(api_key=api_key)
    
    config = types.GenerateContentConfig(
        system_instruction="""You are an expert YouTube Channel Growth Strategist.
I will provide you with a JSON array of the channel's most recent posts (videos), ordered chronologically from oldest to newest (index 0 is the oldest in the dataset, the last index is the newest), along with the channel's mathematical recent growth rate in 'calculatedGrowthRate' (a percentage comparing the first half of recent posts to the second half).
Your task is to analyze this data and provide a macroscopic report explaining why the channel's growth rate is positive or negative, and what content topics or strategies are driving the channel's performance.

### CRITICAL INSTRUCTION ON TREND ###
You MUST base your "growth_trend" response primarily on the 'calculatedGrowthRate' provided in the metadata. If it is significantly negative, you must state "하락세" (Downward trend). If it is significantly positive, you must state "상승세" (Upward trend). If it is close to 0 (e.g. -2% to 2%), you can state "정체기" (Stagnant). DO NOT guess the trend based on raw view counts alone; always respect the provided 'calculatedGrowthRate'.

### LANGUAGE REQUIREMENT ###
CRITICAL: All string values, descriptions, summaries, and feedback inside the JSON object MUST be written in fluent and natural Korean. The JSON keys must remain in English.

### CRITICAL: DO NOT ECHO THE TEMPLATE ###
Under NO CIRCUMSTANCES should you output the placeholder text from the JSON SCHEMA below (such as "상승세 / 하락세 / 정체기 (한국어)", "최근 50~100개 포스트 데이터를 분석하여...", "요인 1 (한국어)"). You MUST generate ACTUAL, REAL insights based on the provided metadata. If you output the placeholder text, the system will fail.

### OUTPUT JSON SCHEMA ###
{
  "growth_trend": "String. Must be one of: 상승세, 하락세, 정체기",
  "analysis_summary": "String. 3-4 sentence summary in Korean explaining the reason for the trend.",
  "key_drivers": [
    "String. Factor 1 in Korean",
    "String. Factor 2 in Korean"
  ],
  "strategic_advice": [
    "String. Advice 1 in Korean",
    "String. Advice 2 in Korean"
  ]
}""",
        temperature=0.7,
        response_mime_type="application/json",
    )
    
    prompt = f"Here is the recent posts metadata for the channel:\n{metadata_json_str}\n\nPlease analyze the channel trend based on this data."
    response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt, config=config)
    clean_json = response.text.replace('```json', '').replace('```', '').strip()
    print(clean_json)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api_key", required=True)
    parser.add_argument("--mode", required=True, choices=["video", "channel"])
    parser.add_argument("--video_id", required=False)
    parser.add_argument("--type", required=False, choices=["short", "long"])
    parser.add_argument("--metadata_base64", required=True)
    parser.add_argument("--step", required=False, choices=["download", "analyze", "all"], default="all")
    
    args = parser.parse_args()
    
    metadata_json_str = base64.b64decode(args.metadata_base64).decode('utf-8')
    
    try:
        if args.mode == "video":
            if not args.video_id or not args.type:
                print('{"error": "video_id and type are required for video mode"}')
                sys.exit(0)
            analyze_video(args.api_key, args.video_id, args.type, metadata_json_str, args.step)
        elif args.mode == "channel":
            analyze_channel(args.api_key, metadata_json_str)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(0)
