from fastapi import FastAPI

app = FastAPI(title="ColdTrack AI Backend")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
