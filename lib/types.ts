export type RiskLevel = "at_risk" | "watch" | "on_track";

export type ReadingSession = {
  session_date: string;
  wpm: number;
  comprehension_score: number;
  minutes_read: number;
  book_id: number;
};

export type Trend = {
  student_id: number;
  wpm_slope: number;
  comprehension_slope: number;
  avg_wpm: number;
  avg_comprehension: number;
  session_count: number;
  last_session: string;
  risk_level: RiskLevel;
};

export type StudentRisk = Trend & {
  id: number;
  name: string;
  baseline_lexile: number;
  interests: string[];
  grade: number;
  classroom_name: string;
};

export type StudentDetail = {
  student: Omit<StudentRisk, keyof Trend>;
  trend: Trend;
  sessions: ReadingSession[];
};

export type Book = {
  id: number;
  title: string;
  author: string;
  lexile_level: number;
  genre: string;
  tags: string[];
  cover: string;
  accent: string;
  cover_url?: string;
};

export type Insight = {
  teacher_blurb: string;
  recommended_book_id: number;
  recommendation_reason: string;
  recommended_book: Book | null;
};
