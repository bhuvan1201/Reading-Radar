import type { Book, Insight, ReadingSession, StudentDetail, StudentRisk } from "./types";

const bookSeeds: Array<[string, string, number, string, string[], string]> = [
  ["Max and the Missing Sneaker", "Dana Wills", 320, "Mystery", ["mystery", "humor"], "#d7e8d3"],
  ["The Dragon Who Couldn't Fly", "R. K. Osei", 410, "Fantasy", ["fantasy", "animals"], "#e9d7ef"],
  ["Ellie's Ocean Adventure", "Marisol Vega", 380, "Adventure", ["ocean", "adventure"], "#c9e4ed"],
  ["The Mystery of Room 6", "Tomas Bright", 450, "Mystery", ["mystery", "friendship"], "#f5dfb5"],
  ["Star Explorers: First Flight", "J. Alden Cho", 520, "Science", ["space", "science"], "#d5d8ee"],
  ["Dinosaur Detectives", "Priya Nandan", 300, "Mystery", ["dinosaurs", "mystery"], "#dce8c6"],
  ["The Funny Farm Chronicles", "Big Sal Ortiz", 250, "Humor", ["humor", "animals"], "#f2d7c9"],
  ["Magic in the Maple Tree", "Wren Castellan", 470, "Fantasy", ["magic", "fantasy"], "#e2d8ee"],
  ["Super Zero", "Andre Lin", 340, "Superhero", ["superheroes", "humor"], "#f4d1a9"],
  ["The Last Snow Day", "Halle Byun", 550, "Realistic Fiction", ["friendship", "adventure"], "#d3e4e4"],
  ["Cave of Whispers", "Otis Faraday", 610, "Adventure", ["adventure", "mystery"], "#d8d4c7"],
  ["Robot Recess", "Nia Fontaine", 360, "Science", ["science", "humor"], "#cfe1ef"],
];

export const demoBooks: Book[] = bookSeeds.map(([title, author, lexile_level, genre, tags, accent], index) => ({
  id: index + 1,
  title,
  author,
  lexile_level,
  genre,
  tags,
  accent,
  cover: ["#24483d", "#6d4d7d", "#266172", "#9b6a31", "#38457b", "#557347"][index % 6],
}));

const names = [
  "Maya Chen", "Sam Rivera", "Jordan Lee", "Avery Thompson", "Noah Williams", "Zoe Martinez",
  "Eli Brooks", "Nora Patel", "Liam Johnson", "Sofia Nguyen", "Caleb Moore", "Isla Davis",
  "Theo Wilson", "Amara Brown", "Miles Garcia", "Layla Anderson", "Ben Carter", "Ruby Kim",
  "Owen Miller", "Chloe Scott", "Mateo Clark", "Ivy Lewis", "Jasper Young", "Emma Walker",
];
const profile = ["at_risk", "at_risk", "watch", "on_track", "on_track", "watch", "on_track", "on_track"] as const;

function dateFor(index: number) {
  const day = 27 - (index % 8) * 3;
  return `2026-08-${String(Math.max(day, 1)).padStart(2, "0")}`;
}

function sessionsFor(id: number, risk: StudentRisk["risk_level"]): ReadingSession[] {
  const sessions: ReadingSession[] = [];
  const slope = risk === "at_risk" ? -0.28 : risk === "watch" ? -0.02 : 0.24;
  for (let i = 0; i < 12; i += 1) {
    const wpm = Math.round(86 + id * 0.7 + slope * i * 7 + Math.sin(id + i) * 4);
    const comprehension = Math.round(76 + (id % 7) + slope * i * 2 + Math.cos(id + i) * 3);
    sessions.push({
      session_date: `2026-${String(6 + Math.floor(i / 5)).padStart(2, "0")}-${String(2 + (i * 4) % 24).padStart(2, "0")}`,
      wpm: Math.max(45, wpm),
      comprehension_score: Math.max(52, Math.min(98, comprehension)),
      minutes_read: 12 + ((id + i) % 12),
      book_id: (id + i) % demoBooks.length + 1,
    });
  }
  return sessions;
}

export const demoStudents: StudentRisk[] = Array.from({ length: 24 }, (_, index) => {
  const id = index + 1;
  const risk = profile[index % profile.length];
  const sessions = sessionsFor(id, risk);
  return {
    id,
    student_id: id,
    name: names[index % names.length],
    baseline_lexile: 320 + (index % 8) * 45,
    interests: demoBooks[index % demoBooks.length].tags,
    grade: 4,
    classroom_name: "Room 104",
    wpm_slope: risk === "at_risk" ? -0.18 - index * 0.004 : risk === "watch" ? 0.008 : 0.16 + (index % 3) * 0.03,
    comprehension_slope: risk === "at_risk" ? -0.09 : risk === "watch" ? -0.01 : 0.07,
    avg_wpm: Math.round(sessions.reduce((sum, item) => sum + item.wpm, 0) / sessions.length),
    avg_comprehension: Math.round(sessions.reduce((sum, item) => sum + item.comprehension_score, 0) / sessions.length),
    session_count: 38,
    last_session: dateFor(index),
    risk_level: risk,
  };
});

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else { quoted = !quoted; }
    } else if (character === "," && !quoted) {
      row.push(field); field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else field += character;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function jsonArray(value: string) {
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function regression(sessions: ReadingSession[], key: "wpm" | "comprehension_score") {
  if (sessions.length < 2) return 0;
  const first = new Date(sessions[0].session_date).getTime();
  const points = sessions.map((session) => ({ x: (new Date(session.session_date).getTime() - first) / 86400000, y: session[key] }));
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  return denominator ? numerator / denominator : 0;
}

async function fetchSampleFile(name: string) {
  const response = await fetch(`/data/${name}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sample file unavailable: ${name}`);
  return response.text();
}

async function loadCsvDemo() {
  const [studentsText, classroomsText, booksText, sessionsText] = await Promise.all([
    fetchSampleFile("students_2026-08-28.csv"),
    fetchSampleFile("classrooms_2026-08-28.csv"),
    fetchSampleFile("books_2026-08-28.csv"),
    fetchSampleFile("reading_sessions_2026-08-28.csv"),
  ]);
  const classrooms = new Map(parseCsv(classroomsText).map((row) => [Number(row.id), row]));
  const sessionsByStudent = new Map<number, ReadingSession[]>();
  parseCsv(sessionsText).forEach((row) => {
    const session = { session_date: row.session_date, wpm: Number(row.wpm), comprehension_score: Number(row.comprehension_score), minutes_read: Number(row.minutes_read), book_id: Number(row.book_id) };
    sessionsByStudent.set(Number(row.student_id), [...(sessionsByStudent.get(Number(row.student_id)) ?? []), session]);
  });
  const books = parseCsv(booksText).map((row, index) => ({ id: Number(row.id), title: row.title, author: row.author, lexile_level: Number(row.lexile_level), genre: row.genre, tags: jsonArray(row.tags), cover_url: row.cover_url, cover: ["#24483d", "#6d4d7d", "#266172", "#9b6a31", "#38457b", "#557347"][index % 6], accent: ["#d7e8d3", "#e9d7ef", "#c9e4ed", "#f5dfb5"][index % 4] }));
  const students = parseCsv(studentsText).map((row) => {
    const id = Number(row.id);
    const classroom = classrooms.get(Number(row.classroom_id));
    const sessions = (sessionsByStudent.get(id) ?? []).sort((a, b) => a.session_date.localeCompare(b.session_date));
    const wpm_slope = regression(sessions, "wpm");
    const comprehension_slope = regression(sessions, "comprehension_score");
    const risk_level = wpm_slope < -0.05 ? "at_risk" : wpm_slope < 0.02 ? "watch" : "on_track";
    return { id, student_id: id, name: row.name, baseline_lexile: Number(row.baseline_lexile), interests: jsonArray(row.interests), grade: Number(classroom?.grade ?? 4), classroom_name: classroom?.name ?? "Room 104", wpm_slope, comprehension_slope, avg_wpm: sessions.reduce((sum, item) => sum + item.wpm, 0) / Math.max(sessions.length, 1), avg_comprehension: sessions.reduce((sum, item) => sum + item.comprehension_score, 0) / Math.max(sessions.length, 1), session_count: sessions.length, last_session: sessions[sessions.length - 1]?.session_date ?? "", risk_level: risk_level as StudentRisk["risk_level"] };
  });
  demoBooks.splice(0, demoBooks.length, ...books);
  return { students, books, sessionsByStudent };
}

let csvDemoPromise: ReturnType<typeof loadCsvDemo> | null = null;

async function getCsvDemo() {
  csvDemoPromise ??= loadCsvDemo();
  return csvDemoPromise;
}

export function getDemoDetail(id: number): StudentDetail {
  const student = demoStudents.find((item) => item.id === id) ?? demoStudents[0];
  return { student, trend: student, sessions: sessionsFor(student.id, student.risk_level) };
}

export function getDemoInsight(student: StudentRisk): Insight {
  const book = demoBooks.find((item) => item.lexile_level >= student.baseline_lexile - 80) ?? demoBooks[0];
  const isRisk = student.risk_level === "at_risk";
  return {
    teacher_blurb: isRisk
      ? `${student.name}'s reading pace has softened over the last few weeks, and comprehension is beginning to move in the same direction. Their current level still looks workable, so a small check-in now could help reverse the trend.`
      : `${student.name} is building a steady reading rhythm and showing encouraging comprehension across recent sessions. A slightly more challenging ebook could keep that momentum going.`,
    recommended_book_id: book.id,
    recommendation_reason: `This ${book.genre.toLowerCase()} title matches ${student.name.split(" ")[0]}'s interests and sits close to their current reading level.`,
    recommended_book: book,
  };
}

const coverPalette = ["#24483d", "#6d4d7d", "#266172", "#9b6a31", "#38457b", "#557347"];

function normalizeBook(book: Omit<Book, "cover" | "accent"> & Partial<Pick<Book, "cover" | "accent">>) {
  return { ...book, cover: book.cover ?? coverPalette[book.id % coverPalette.length], accent: book.accent ?? "#d7e8d3" };
}

function apiUrl(path: string) {
  return path;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loadStudents(): Promise<{ students: StudentRisk[]; demo: boolean }> {
  try {
    const students = await fetchJson<StudentRisk[]>("/api/students/risk");
    if (students.length) return { students, demo: false };
  } catch { /* Demo mode keeps the presentation usable without local services. */ }
  try { return { students: (await getCsvDemo()).students, demo: true }; }
  catch { return { students: demoStudents, demo: true }; }
}

export async function loadStudentDetail(id: number): Promise<{ detail: StudentDetail; demo: boolean }> {
  try {
    return { detail: await fetchJson<StudentDetail>(`/api/students/${id}`), demo: false };
  } catch {
    try {
      const csv = await getCsvDemo();
      const student = csv.students.find((item) => item.id === id) ?? csv.students[0];
      return { detail: { student, trend: student, sessions: csv.sessionsByStudent.get(student.id) ?? [] }, demo: true };
    } catch { return { detail: getDemoDetail(id), demo: true }; }
  }
}

export async function loadBooks(): Promise<Book[]> {
  try {
    const books = await fetchJson<Array<Omit<Book, "cover" | "accent">>>("/api/students/books");
    if (books.length) return books.map(normalizeBook);
  } catch { /* Fall back to the bundled catalog when the API is unavailable. */ }
  try { return (await getCsvDemo()).books; }
  catch { return demoBooks; }
}

export async function loadInsight(id: number, student: StudentRisk): Promise<{ insight: Insight; demo: boolean }> {
  try {
    const insight = await fetchJson<Insight>(`/api/students/${id}/insight`);
    return { insight: { ...insight, recommended_book: insight.recommended_book ? normalizeBook(insight.recommended_book) : null }, demo: false };
  } catch {
    return { insight: getDemoInsight(student), demo: true };
  }
}
