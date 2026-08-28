"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { demoStudents, loadStudents } from "@/lib/data";
import type { RiskLevel, StudentRisk } from "@/lib/types";

const statusLabels: Record<RiskLevel, string> = {
  at_risk: "Needs a closer look",
  watch: "Steady",
  on_track: "Improving",
};

function formatDate(date: string) {
  if (!date) return "No session yet";
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "No session yet"
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRisk[]>(demoStudents);
  const [demo, setDemo] = useState(true);
  const [query, setQuery] = useState("");
  const [classroom, setClassroom] = useState("All classrooms");
  const [status, setStatus] = useState("All statuses");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents().then((result) => {
      setStudents(result.students);
      setDemo(result.demo);
      setLoading(false);
    });
  }, []);

  const classrooms = [
    "All classrooms",
    ...Array.from(new Set(students.map((student) => student.classroom_name))),
  ];
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesName = student.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesClassroom =
          classroom === "All classrooms" ||
          student.classroom_name === classroom;
        const matchesStatus =
          status === "All statuses" ||
          statusLabels[student.risk_level] === status;
        return matchesName && matchesClassroom && matchesStatus;
      }),
    [classroom, query, status, students],
  );

  return (
    <AppShell demo={demo}>
      <div className="page-wrap students-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Classroom roster</span>
            <h1>All students</h1>
            <p>
              See each reader’s current rhythm and where a small step could
              help.
            </p>
          </div>
          <Link href="/" className="secondary-button">
            <Icon name="arrow" size={15} /> Back to overview
          </Link>
        </div>

        <section className="roster-summary" aria-label="Roster summary">
          <div>
            <strong>{students.length}</strong>
            <span>students in roster</span>
          </div>
          <div>
            <strong>
              {
                students.filter((student) => student.risk_level === "on_track")
                  .length
              }
            </strong>
            <span>moving forward</span>
          </div>
          <div>
            <strong>
              {
                students.filter((student) => student.risk_level === "at_risk")
                  .length
              }
            </strong>
            <span>need a closer look</span>
          </div>
        </section>

        <section className="roster-card paper-card">
          <div className="roster-toolbar">
            <label className="search-field roster-search">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students"
                aria-label="Search students by name"
              />
            </label>
            <select
              value={classroom}
              onChange={(event) => setClassroom(event.target.value)}
              aria-label="Filter by classroom"
            >
              {classrooms.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by reading status"
            >
              <option>All statuses</option>
              {Object.values(statusLabels).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <span className="result-count">
              {filteredStudents.length} shown
            </span>
          </div>

          {loading ? (
            <div className="roster-state">
              <span className="eyebrow">Reading the room</span>
              <h2>Loading students...</h2>
              <p>Gathering the latest classroom trends.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="roster-state">
              <Icon name="search" size={27} />
              <h2>No students found</h2>
              <p>Try a different name, classroom, or status.</p>
              <button
                className="text-link"
                onClick={() => {
                  setQuery("");
                  setClassroom("All classrooms");
                  setStatus("All statuses");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className="roster-table"
              role="table"
              aria-label="Student performance roster"
            >
              <div className="roster-row roster-header" role="row">
                <span>Student</span>
                <span>Status</span>
                <span>Reading pace</span>
                <span>Comprehension</span>
                <span>Last session</span>
                <span />
              </div>
              {filteredStudents.map((student, index) => (
                <Link
                  href={`/students/${student.id}`}
                  className="roster-row"
                  role="row"
                  key={student.id}
                >
                  <span className="roster-student">
                    <span
                      className={`student-avatar avatar-${(index % 4) + 1}`}
                    >
                      {initials(student.name)}
                    </span>
                    <span>
                      <strong>{student.name}</strong>
                      <small>
                        Grade {student.grade} · {student.classroom_name}
                      </small>
                    </span>
                  </span>
                  <span>
                    <span
                      className={`status-tag ${student.risk_level === "at_risk" ? "alert" : student.risk_level === "watch" ? "watch" : "positive-tag"}`}
                    >
                      {statusLabels[student.risk_level]}
                    </span>
                  </span>
                  <span className="roster-metric">
                    <strong>{Math.round(student.avg_wpm)} WPM</strong>
                    <small
                      className={
                        student.wpm_slope < 0 ? "negative" : "positive"
                      }
                    >
                      {student.wpm_slope < 0 ? "↓" : "↑"}{" "}
                      {Math.abs(student.wpm_slope).toFixed(2)} / day
                    </small>
                  </span>
                  <span className="roster-metric">
                    <strong>{Math.round(student.avg_comprehension)}%</strong>
                    <small
                      className={
                        student.comprehension_slope < 0
                          ? "negative"
                          : "positive"
                      }
                    >
                      {student.comprehension_slope < 0 ? "↓" : "↑"}{" "}
                      {Math.abs(student.comprehension_slope).toFixed(2)} / day
                    </small>
                  </span>
                  <span className="roster-date">
                    {formatDate(student.last_session)}
                  </span>
                  <span className="roster-arrow">
                    <Icon name="chevron" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
