from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import traceback
from ai_analyzer import analyze_video, analyze_channel

app = FastAPI(title="NewCow AI Analyzer API")

class VideoAnalysisRequest(BaseModel):
    api_key: str
    video_id: str
    type: str
    metadata_json_str: str
    step: str = "all"

class ChannelAnalysisRequest(BaseModel):
    api_key: str
    metadata_json_str: str

@app.post("/analyze/video")
async def api_analyze_video(req: VideoAnalysisRequest):
    try:
        result = analyze_video(
            api_key=req.api_key,
            video_id=req.video_id,
            video_type=req.type,
            metadata_json_str=req.metadata_json_str,
            step=req.step
        )
        # If it was just a download step, analyze_video returns None and prints json, but let's return a success
        if result is None and req.step == "download":
            return {"status": "downloaded"}
        return result
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/channel")
async def api_analyze_channel(req: ChannelAnalysisRequest):
    try:
        result = analyze_channel(
            api_key=req.api_key,
            metadata_json_str=req.metadata_json_str
        )
        return result
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
