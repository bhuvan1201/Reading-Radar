from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db import get_ch_client, get_pg_conn
from ..services import ai, risk

router = APIRouter(prefix="/api/students", tags=["students"])


class ReadingSessionCreate(BaseModel):
    student_id: int = Field(gt=0)
    book_id: int = Field(gt=0)
    minutes_read: int = Field(gt=0, le=1440)
    wpm: float = Field(gt=0, le=2000)
    comprehension_score: float = Field(ge=0, le=100)
    session_date: date | None = None


def pg_conn():
    conn = get_pg_conn()
    try:
        yield conn
    finally:
        conn.close()


def ch_client():
    client = get_ch_client()
    try:
        yield client
    finally:
        client.close()


@router.get(
    "/risk",
    operation_id="listStudentsByRisk",
    summary="List all students ranked by reading-trend risk",
    description=(
        "Returns every student ranked by their reading-speed trend, most concerning first. "
        "Use this to answer questions like 'who's falling behind?', 'who needs a check-in?', "
        "'who hasn't read in a while?' (check each student's last_session date), or 'who is "
        "improving?'. Each entry includes risk_level (at_risk, watch, or on_track), wpm_slope "
        "(negative means reading speed is declining over time), avg_wpm, avg_comprehension, "
        "session_count, and last_session (the most recent date this student logged a reading "
        "session)."
    ),
)
def list_risk_ranked(limit: int = 50, conn=Depends(pg_conn), ch=Depends(ch_client)):
    ranked = risk.get_risk_ranked_students(ch)[:limit]
    if not ranked:
        return []

    ids = [r["student_id"] for r in ranked]
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT s.id, s.name, s.baseline_lexile, s.interests, c.grade, c.name AS classroom_name
            FROM students s
            JOIN classrooms c ON c.id = s.classroom_id
            WHERE s.id = ANY(%s)
            """,
            (ids,),
        )
        by_id = {row["id"]: row for row in cur.fetchall()}

    return [
        {**by_id[r["student_id"]], **r}
        for r in ranked
        if r["student_id"] in by_id
    ]


@router.get("/books")
def list_books(conn=Depends(pg_conn)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, author, lexile_level, genre, tags, cover_url
            FROM books
            ORDER BY lexile_level ASC, title ASC
            """
        )
        return cur.fetchall()


@router.post("/sessions", status_code=201)
def create_reading_session(
    payload: ReadingSessionCreate,
    conn=Depends(pg_conn),
    ch=Depends(ch_client),
):
    """Record one reading event in ClickHouse after validating its entities."""
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM students WHERE id = %s", (payload.student_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Student not found")

        cur.execute("SELECT id FROM books WHERE id = %s", (payload.book_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Ebook not found")

    recorded_date = payload.session_date or date.today()
    ch.insert(
        "reading_sessions",
        [[
            payload.student_id,
            payload.book_id,
            recorded_date,
            payload.minutes_read,
            round(payload.minutes_read * payload.wpm),
            payload.wpm,
            0,
            0,
            payload.comprehension_score,
        ]],
        column_names=[
            "student_id",
            "book_id",
            "session_date",
            "minutes_read",
            "words_read",
            "wpm",
            "quiz_correct",
            "quiz_total",
            "comprehension_score",
        ],
    )
    return {
        "status": "saved",
        "student_id": payload.student_id,
        "book_id": payload.book_id,
        "session_date": recorded_date.isoformat(),
    }


@router.get(
    "/{student_id}",
    operation_id="getStudentDetail",
    summary="Get one student's profile, reading trend, and full session history",
    description=(
        "Returns a single student's profile (name, grade, interests, classroom), their "
        "computed reading trend (same fields as the risk list), and every individual "
        "reading session on record (date, words-per-minute, comprehension score, minutes "
        "read, book). Use this when a question is about one named or already-identified "
        "student specifically."
    ),
)
def get_student_detail(student_id: int, conn=Depends(pg_conn), ch=Depends(ch_client)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT s.id, s.name, s.baseline_lexile, s.interests, c.grade, c.name AS classroom_name
            FROM students s
            JOIN classrooms c ON c.id = s.classroom_id
            WHERE s.id = %s
            """,
            (student_id,),
        )
        student = cur.fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    trend = risk.get_student_trend(ch, student_id)
    sessions = risk.get_student_sessions(ch, student_id)

    return {"student": student, "trend": trend, "sessions": sessions}


@router.get(
    "/{student_id}/insight",
    operation_id="getStudentInsight",
    summary="Get an AI-written teacher note and book recommendation for one student",
    description=(
        "Generates a short, plain-language explanation of what's happening with this "
        "student's reading (translated from the trend data, no jargon) plus one recommended "
        "next book matched to their interests and level. Use this when a teacher asks what "
        "to do about a specific student, or wants a book suggestion for them. This calls an "
        "LLM, so only use it for one student at a time, not in a loop over many students."
    ),
)
def get_student_insight(student_id: int, conn=Depends(pg_conn), ch=Depends(ch_client)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT s.id, s.name, s.baseline_lexile, s.interests, c.grade
            FROM students s
            JOIN classrooms c ON c.id = s.classroom_id
            WHERE s.id = %s
            """,
            (student_id,),
        )
        student = cur.fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    trend = risk.get_student_trend(ch, student_id)
    if not trend:
        raise HTTPException(status_code=404, detail="Not enough reading sessions yet")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, author, lexile_level, genre, tags, cover_url
            FROM books
            WHERE lexile_level BETWEEN %s AND %s
            ORDER BY (tags && %s) DESC, ABS(lexile_level - %s) ASC
            LIMIT 5
            """,
            (
                student["baseline_lexile"] - 150,
                student["baseline_lexile"] + 150,
                student["interests"],
                student["baseline_lexile"],
            ),
        )
        candidate_books = cur.fetchall()

    # cover_url is irrelevant to the model's book choice and just adds noise/tokens
    books_for_prompt = [
        {k: v for k, v in b.items() if k != "cover_url"} for b in candidate_books
    ]
    insight = ai.generate_teacher_insight(student, trend, books_for_prompt)
    recommended = next(
        (b for b in candidate_books if b["id"] == insight["recommended_book_id"]), None
    )

    return {**insight, "recommended_book": recommended}
