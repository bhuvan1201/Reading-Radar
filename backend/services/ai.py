import json
import os

import anthropic

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5")

_client = anthropic.Anthropic()

INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "teacher_blurb": {
            "type": "string",
            "description": "2-3 plain-language sentences a busy teacher can read in 10 seconds: what's happening with this student and why it matters, no jargon.",
        },
        "recommended_book_id": {"type": "integer"},
        "recommendation_reason": {
            "type": "string",
            "description": "One sentence on why this book fits this student right now.",
        },
    },
    "required": ["teacher_blurb", "recommended_book_id", "recommendation_reason"],
    "additionalProperties": False,
}


def generate_teacher_insight(student: dict, trend: dict, candidate_books: list[dict]) -> dict:
    """
    student: {name, grade, interests, baseline_lexile}
    trend: {wpm_slope, comprehension_slope, avg_wpm, avg_comprehension, session_count, risk_level}
    candidate_books: [{id, title, author, lexile_level, genre, tags}, ...]
    """
    schema = json.loads(json.dumps(INSIGHT_SCHEMA))
    schema["properties"]["recommended_book_id"]["enum"] = [b["id"] for b in candidate_books]

    prompt = f"""A student's reading data over the last several weeks:

Name: {student['name']}
Grade: {student['grade']}
Interests: {', '.join(student['interests'])}
Current baseline lexile: {student['baseline_lexile']}

Trend (from {trend['session_count']} reading sessions):
- Words-per-minute trend: {trend['wpm_slope']:+.3f} wpm/day (avg {trend['avg_wpm']:.0f} wpm)
- Comprehension trend: {trend['comprehension_slope']:+.3f} pts/day (avg {trend['avg_comprehension']:.0f}%)
- Risk classification: {trend['risk_level']}

Candidate next books (pick exactly one by id):
{json.dumps(candidate_books, indent=2)}

Write a short teacher-facing note explaining what's happening with this student
in plain language (no stats jargon — translate the slope into what a teacher
would actually notice in the classroom), and recommend the best next book
from the candidates based on their interests and current level."""

    response = _client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)
