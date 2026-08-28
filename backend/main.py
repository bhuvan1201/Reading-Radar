from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import students

app = FastAPI(
    title="Reading Radar API",
    description=(
        "Backend for Reading Radar: tracks student reading trends (words-per-minute and "
        "comprehension over time) and flags students who are quietly falling behind, even "
        "if their current reading level still looks fine."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
