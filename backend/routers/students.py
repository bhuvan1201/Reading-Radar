from fastapi import APIRouter, Depends, HTTPException

from ..db import get_ch_client, get_pg_conn
from ..services import ai, risk

router = APIRouter(prefix="/api/students", tags=["students"])


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


@router.get("/risk")
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


@router.get("/{student_id}")
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


@router.get("/{student_id}/insight")
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
