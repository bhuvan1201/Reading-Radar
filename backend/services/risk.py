"""
Risk scoring — this is the ClickHouse-native trick behind Reading Radar.

Instead of flagging students by absolute reading level (which misses kids
who look "fine" but are quietly sliding), we compute the *slope* of each
student's words-per-minute and comprehension over time using ClickHouse's
simpleLinearRegression aggregate function. A negative slope is a real
regression even if the student's current wpm is still above grade level.
"""

RISK_QUERY = """
SELECT
    student_id,
    tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), wpm), 1)                 AS wpm_slope,
    tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), comprehension_score), 1)  AS comprehension_slope,
    avg(wpm)                 AS avg_wpm,
    avg(comprehension_score) AS avg_comprehension,
    count()                  AS session_count,
    max(session_date)        AS last_session
FROM reading_sessions
WHERE session_date >= today() - {lookback_days:UInt16}
GROUP BY student_id
HAVING session_count >= {min_sessions:UInt8}
ORDER BY wpm_slope ASC
"""

SESSIONS_QUERY = """
SELECT session_date, wpm, comprehension_score, minutes_read, book_id
FROM reading_sessions
WHERE student_id = {student_id:UInt32}
ORDER BY session_date ASC
"""

STUDENT_TREND_QUERY = """
SELECT
    student_id,
    tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), wpm), 1)                 AS wpm_slope,
    tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), comprehension_score), 1)  AS comprehension_slope,
    avg(wpm)                 AS avg_wpm,
    avg(comprehension_score) AS avg_comprehension,
    count()                  AS session_count,
    max(session_date)        AS last_session
FROM reading_sessions
WHERE student_id = {student_id:UInt32}
  AND session_date >= today() - {lookback_days:UInt16}
GROUP BY student_id
"""

AT_RISK_SLOPE = -0.05
WATCH_SLOPE = 0.02


def classify_risk(wpm_slope: float) -> str:
    if wpm_slope < AT_RISK_SLOPE:
        return "at_risk"
    if wpm_slope < WATCH_SLOPE:
        return "watch"
    return "on_track"


def get_risk_ranked_students(ch_client, lookback_days: int = 90, min_sessions: int = 4):
    result = ch_client.query(
        RISK_QUERY,
        parameters={"lookback_days": lookback_days, "min_sessions": min_sessions},
    )
    rows = []
    for row in result.named_results():
        rows.append({
            **row,
            "risk_level": classify_risk(row["wpm_slope"]),
        })
    return rows


def get_student_sessions(ch_client, student_id: int):
    result = ch_client.query(SESSIONS_QUERY, parameters={"student_id": student_id})
    return list(result.named_results())


def get_student_trend(ch_client, student_id: int, lookback_days: int = 90):
    result = ch_client.query(
        STUDENT_TREND_QUERY,
        parameters={"student_id": student_id, "lookback_days": lookback_days},
    )
    rows = list(result.named_results())
    if not rows:
        return None
    row = rows[0]
    return {**row, "risk_level": classify_risk(row["wpm_slope"])}
