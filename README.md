# Reading Radar

A teacher-facing dashboard that spots students who are "quietly struggling" —
reading trend turning negative even if their absolute level still looks
fine — and recommends the next book they'll actually finish.

Built for the ClickHouse hackathon (reading-crisis track): **Postgres** holds
entities (students, books, classrooms), **ClickHouse** holds the reading
session event stream and does the trend math.

## Production

- Frontend: https://reading-radar.vercel.app
- Backend API: https://reading-radar-api-production.up.railway.app
- Health check: https://reading-radar-api-production.up.railway.app/api/health

## Architecture

```
Postgres (OLTP)              ClickHouse (OLAP)
  schools                      reading_sessions
  teachers                       (student_id, book_id, session_date,
  classrooms                      minutes_read, words_read, wpm,
  students                        quiz_correct, quiz_total,
  books                           comprehension_score)
  assignments
        \                          /
         \                        /
        backend/ (FastAPI) — joins both, calls Claude for the
                              teacher-facing blurb + book rec
                        |
                    frontend (TBD)
```

The core trick: ClickHouse's `simpleLinearRegression` aggregate function
computes each student's wpm/comprehension **slope over time** in one query
(see `backend/services/risk.py` / `db/clickhouse/schema.sql`). A negative
slope flags a student who's sliding even if their current wpm still looks
okay — that's "quietly struggling."

## Local setup

```bash
cp .env.example .env          # fill in ANTHROPIC_API_KEY
docker compose up -d          # starts Postgres (5432) + ClickHouse (8123/9000)

python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt -r backend/requirements.txt

# generate synthetic students/books/90-days-of-sessions with mixed trends
python scripts/generate_seed_data.py --reset --students 40

# run the API
export $(cat .env | xargs)    # or use python-dotenv
uvicorn backend.main:app --reload --port 8000
```

Then:

```bash
curl localhost:8000/api/students/risk | jq
curl localhost:8000/api/students/1 | jq
curl localhost:8000/api/students/1/insight | jq   # calls Claude
```

## API

- `GET /api/students/risk` — all students ranked by wpm trend slope (most
  negative first), with `risk_level`: `at_risk` / `watch` / `on_track`.
- `GET /api/students/{id}` — student detail + full session history (for a
  sparkline) + trend stats.
- `GET /api/students/{id}/insight` — calls Claude to generate a plain-language
  teacher blurb + a recommended next book from candidates near the student's
  level and interests. Called on-demand (not baked into the list endpoint) to
  keep the list fast and cheap.

## Repo layout

```
db/postgres/schema.sql       students, books, classrooms, assignments
db/clickhouse/schema.sql     reading_sessions fact table + reference query
scripts/generate_seed_data.py synthetic data w/ mixed trend shapes (this
                               is what makes the demo convincing — real
                               classroom data won't exist on day one)
backend/                     FastAPI app
  services/risk.py             the ClickHouse slope query
  services/ai.py                Claude call -> {teacher_blurb, book rec}
  routers/students.py           HTTP endpoints
```

## Still needed (day-of)

- [ ] Frontend: ranked list view + student detail (sparkline + AI blurb + book
      cover/rec). Next.js + Tailwind + Recharts is the fast path.
- [ ] Point `.env` at ClickHouse Cloud instead of local Docker before the
      demo (ask the partner engineers at the expert bar for a fast setup).
- [ ] Stretch: LibreChat tool/plugin wrapping `/api/students/risk` and
      `/api/students/{id}/insight` for the bonus category — "ask about my
      class" in chat.
