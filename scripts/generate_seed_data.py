"""
Reading Radar — synthetic data generator.

Creates schools/teachers/classrooms/students/books/assignments in Postgres,
then generates ~90 days of reading_sessions events in ClickHouse with
deliberately mixed trend shapes (improving / flat / declining / volatile)
per student, so the risk-ranking query has something real to find.

Usage:
    python scripts/generate_seed_data.py [--reset] [--students 40]
"""

import argparse
import os
import random
from datetime import date, timedelta

import clickhouse_connect
import psycopg2
from faker import Faker

fake = Faker()

POSTGRES_DSN = os.environ.get(
    "POSTGRES_DSN", "postgresql://reading_radar:reading_radar@localhost:5432/reading_radar"
)
CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.environ.get("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "reading_radar")
CLICKHOUSE_DATABASE = os.environ.get("CLICKHOUSE_DATABASE", "reading_radar")
CLICKHOUSE_SECURE = os.environ.get("CLICKHOUSE_SECURE", "false").lower() == "true"

TAG_POOL = [
    "animals", "adventure", "friendship", "mystery", "sports", "fantasy",
    "humor", "science", "space", "graphic novels", "magic", "dinosaurs",
    "superheroes", "ocean", "history",
]

# (title, author, lexile_level, genre, tags)
BOOKS = [
    ("Max and the Missing Sneaker", "Dana Wills", 320, "Mystery", ["mystery", "humor"]),
    ("The Dragon Who Couldn't Fly", "R. K. Osei", 410, "Fantasy", ["fantasy", "animals"]),
    ("Ellie's Ocean Adventure", "Marisol Vega", 380, "Adventure", ["ocean", "adventure"]),
    ("The Mystery of Room 6", "Tomas Bright", 450, "Mystery", ["mystery", "friendship"]),
    ("Star Explorers: First Flight", "J. Alden Cho", 520, "Science", ["space", "science"]),
    ("Dinosaur Detectives", "Priya Nandan", 300, "Mystery", ["dinosaurs", "mystery"]),
    ("The Funny Farm Chronicles", "Big Sal Ortiz", 250, "Humor", ["humor", "animals"]),
    ("Magic in the Maple Tree", "Wren Castellan", 470, "Fantasy", ["magic", "fantasy"]),
    ("Super Zero", "Andre Lin", 340, "Superhero", ["superheroes", "humor"]),
    ("Under the Big Top", "Colette Marsh", 400, "Realistic Fiction", ["friendship", "humor"]),
    ("The Last Snow Day", "Halle Byun", 550, "Realistic Fiction", ["friendship", "adventure"]),
    ("Cave of Whispers", "Otis Faraday", 610, "Adventure", ["adventure", "mystery"]),
    ("Robot Recess", "Nia Fontaine", 360, "Science", ["science", "humor"]),
    ("The Great Backyard Race", "Deshawn Price", 280, "Sports", ["sports", "humor"]),
    ("Whiskers and the Lost Treasure", "Ingrid Solheim", 330, "Adventure", ["animals", "adventure"]),
    ("Journey to Cloud Island", "Mateo Reyes-Lin", 480, "Fantasy", ["fantasy", "adventure"]),
    ("The Invisible Friend", "Sasha Duong", 500, "Realistic Fiction", ["friendship", "magic"]),
    ("Soccer Star Sam", "Kwame Osei", 260, "Sports", ["sports", "friendship"]),
    ("The Time-Traveling Backpack", "Renee Kowalski", 580, "Science", ["science", "adventure"]),
    ("Luna and the Night Garden", "Ines Trabelsi", 420, "Fantasy", ["magic", "animals"]),
    ("Bug Club Investigators", "Owen Petrakis", 290, "Mystery", ["mystery", "science"]),
    ("The Kindness Project", "Alba Moreno", 440, "Realistic Fiction", ["friendship", "history"]),
    ("Castle of Small Wonders", "Theo Winslow", 630, "Fantasy", ["magic", "fantasy"]),
    ("Ocean Deep Mystery", "Farrah Delgado", 560, "Mystery", ["ocean", "mystery"]),
]

GRADE_BASELINE_WPM = {3: 70, 4: 90, 5: 110}

# trend_type -> (wpm_slope_range, comprehension_slope_range, wpm_noise, weight)
TREND_PROFILES = {
    "improving": ((0.15, 0.4), (0.05, 0.15), 4.0, 0.50),
    "flat": ((-0.03, 0.03), (-0.03, 0.03), 3.0, 0.20),
    "declining": ((-0.35, -0.10), (-0.20, -0.05), 4.0, 0.25),
    "volatile": ((-0.05, 0.05), (-0.05, 0.05), 12.0, 0.05),
}


def pick_trend_type():
    types, weights = zip(*[(k, v[3]) for k, v in TREND_PROFILES.items()])
    return random.choices(types, weights=weights, k=1)[0]


def reset_postgres(cur):
    cur.execute("TRUNCATE assignments, students, books, classrooms, teachers, schools RESTART IDENTITY CASCADE;")


def seed_postgres(conn, n_students):
    cur = conn.cursor()

    cur.execute("INSERT INTO schools (name) VALUES (%s) RETURNING id", ("Cedar Grove Elementary",))
    school_id = cur.fetchone()[0]

    teacher_ids = []
    for name in ["Ms. Alvarez", "Mr. Whitfield", "Mx. Chen"]:
        cur.execute(
            "INSERT INTO teachers (school_id, name, email) VALUES (%s, %s, %s) RETURNING id",
            (school_id, name, name.lower().replace(" ", "").replace(".", "") + "@cedargrove.edu"),
        )
        teacher_ids.append(cur.fetchone()[0])

    classroom_ids = []
    for teacher_id, grade in zip(teacher_ids, [3, 4, 5]):
        cur.execute(
            "INSERT INTO classrooms (teacher_id, name, grade) VALUES (%s, %s, %s) RETURNING id",
            (teacher_id, f"Room {100 + grade}", grade),
        )
        classroom_ids.append((cur.fetchone()[0], grade))

    book_ids = []
    for title, author, lexile, genre, tags in BOOKS:
        cur.execute(
            "INSERT INTO books (title, author, lexile_level, genre, tags) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (title, author, lexile, genre, tags),
        )
        book_ids.append((cur.fetchone()[0], lexile, tags))

    students = []  # (id, classroom_id, grade, trend_type, baseline_wpm, interests)
    for i in range(n_students):
        classroom_id, grade = random.choice(classroom_ids)
        interests = random.sample(TAG_POOL, k=random.randint(2, 4))
        baseline_wpm = GRADE_BASELINE_WPM[grade] + random.uniform(-15, 15)
        baseline_lexile = int(300 + (baseline_wpm - 70) * 4 + random.uniform(-40, 40))
        trend_type = pick_trend_type()

        cur.execute(
            "INSERT INTO students (classroom_id, name, baseline_lexile, interests) VALUES (%s, %s, %s, %s) RETURNING id",
            (classroom_id, fake.first_name() + " " + fake.last_name(), baseline_lexile, interests),
        )
        student_id = cur.fetchone()[0]
        students.append((student_id, classroom_id, grade, trend_type, baseline_wpm, interests))

        # Assign 1-2 books that roughly match interests/level
        matching = [b for b in book_ids if set(b[2]) & set(interests)] or book_ids
        for book_id, _, _ in random.sample(matching, k=min(2, len(matching))):
            cur.execute(
                "INSERT INTO assignments (student_id, book_id, status) VALUES (%s, %s, 'in_progress')",
                (student_id, book_id),
            )

    conn.commit()
    return students, book_ids


def generate_sessions(students, book_ids, days=90, sessions_per_week=3):
    today = date.today()
    rows = []

    for student_id, _classroom_id, _grade, trend_type, baseline_wpm, interests in students:
        wpm_slope_range, comp_slope_range, noise, _weight = TREND_PROFILES[trend_type]
        wpm_slope = random.uniform(*wpm_slope_range)
        comp_slope = random.uniform(*comp_slope_range)
        baseline_comp = random.uniform(65, 90)

        matching = [b for b in book_ids if set(b[2]) & set(interests)] or book_ids
        student_books = random.sample(matching, k=min(3, len(matching)))

        session_days = sorted(
            random.sample(range(days), k=int(days / 7 * sessions_per_week))
        )
        for day_offset in session_days:
            session_date = today - timedelta(days=days - day_offset)
            wpm = max(20.0, baseline_wpm + wpm_slope * day_offset + random.gauss(0, noise))
            comprehension = min(100.0, max(20.0, baseline_comp + comp_slope * day_offset + random.gauss(0, 5)))
            minutes_read = random.randint(10, 25)
            words_read = int(wpm * minutes_read)
            quiz_total = 5
            quiz_correct = round(quiz_total * (comprehension / 100))
            book_id = random.choice(student_books)[0]

            rows.append([
                student_id, book_id, session_date, minutes_read, words_read,
                round(wpm, 1), int(quiz_correct), quiz_total, round(comprehension, 1),
            ])

    return rows


def seed_clickhouse(rows, reset):
    client = clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST, port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER, password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DATABASE, secure=CLICKHOUSE_SECURE,
    )
    if reset:
        client.command("TRUNCATE TABLE IF EXISTS reading_sessions")

    client.insert(
        "reading_sessions",
        rows,
        column_names=[
            "student_id", "book_id", "session_date", "minutes_read", "words_read",
            "wpm", "quiz_correct", "quiz_total", "comprehension_score",
        ],
    )
    return client


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Truncate existing data before seeding")
    parser.add_argument("--students", type=int, default=40)
    args = parser.parse_args()

    conn = psycopg2.connect(POSTGRES_DSN)
    if args.reset:
        with conn.cursor() as cur:
            reset_postgres(cur)
        conn.commit()

    students, book_ids = seed_postgres(conn, args.students)
    conn.close()

    rows = generate_sessions(students, book_ids)
    seed_clickhouse(rows, reset=args.reset)

    trend_counts = {}
    for s in students:
        trend_counts[s[3]] = trend_counts.get(s[3], 0) + 1

    print(f"Seeded {len(students)} students, {len(book_ids)} books, {len(rows)} reading sessions.")
    print(f"Trend mix: {trend_counts}")


if __name__ == "__main__":
    main()
