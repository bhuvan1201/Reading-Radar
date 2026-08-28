-- Reading Radar — ClickHouse schema (events / OLAP)

CREATE DATABASE IF NOT EXISTS reading_radar;

CREATE TABLE IF NOT EXISTS reading_radar.reading_sessions
(
    student_id           UInt32,
    book_id              UInt32,
    session_date         Date,
    minutes_read         UInt16,
    words_read           UInt32,
    wpm                  Float32,
    quiz_correct         UInt8,
    quiz_total           UInt8,
    comprehension_score  Float32
)
ENGINE = MergeTree()
ORDER BY (student_id, session_date);

-- Reference: risk-ranked students by reading-trend slope.
-- simpleLinearRegression(x, y) returns a (k, b) tuple; k is the slope.
-- A negative wpm_slope means the student is reading slower over time
-- even if their absolute wpm still looks fine — that's "quietly struggling".
--
-- SELECT
--     student_id,
--     tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), wpm), 1)                  AS wpm_slope,
--     tupleElement(simpleLinearRegression(toFloat64(toRelativeDayNum(session_date)), comprehension_score), 1)  AS comprehension_slope,
--     avg(wpm)                AS avg_wpm,
--     avg(comprehension_score) AS avg_comprehension,
--     count()                  AS session_count,
--     max(session_date)        AS last_session
-- FROM reading_radar.reading_sessions
-- GROUP BY student_id
-- HAVING session_count >= 4
-- ORDER BY wpm_slope ASC
