import os
import json
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Import the core logic from ai_analyzer
import ai_analyzer

app = FastAPI(title="NewCow AI Analyzer Service")

class VideoAnalyzeRequest(BaseModel):
    api_key: str
    video_id: str
    type: str
    metadata_json_str: str
    step: str = "all"

class ChannelAnalyzeRequest(BaseModel):
    api_key: str
    metadata_json_str: str

@app.post("/analyze/video")
async def analyze_video_endpoint(req: VideoAnalyzeRequest):
    try:
        # We need to capture the printed JSON or refactor ai_analyzer to return it.
        # Since we modified ai_analyzer to return the dict (we will do this next), we can just call it.
        result = ai_analyzer.analyze_video(
            api_key=req.api_key,
            video_id=req.video_id,
            video_type=req.type,
            metadata_json_str=req.metadata_json_str,
            step=req.step
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/channel")
async def analyze_channel_endpoint(req: ChannelAnalyzeRequest):
    try:
        result = ai_analyzer.analyze_channel(
            api_key=req.api_key,
            metadata_json_str=req.metadata_json_str
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}
