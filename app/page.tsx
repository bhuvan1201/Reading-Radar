"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { TrendChart } from "@/components/Charts";
import {
  demoBooks,
  demoStudents,
  loadBooks,
  loadClassPulse,
  loadStudents,
} from "@/lib/data";
import type { ReadingSession } from "@/lib/types";
import type { StudentRisk } from "@/lib/types";

function statusCopy(status: StudentRisk["risk_level"]) {
  return status === "at_risk"
    ? "Needs a closer look"
    : status === "watch"
      ? "Steady"
      : "Improving";
}
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const [students, setStudents] = useState<StudentRisk[]>(demoStudents);
  const [books, setBooks] = useState(demoBooks);
  const [demo, setDemo] = useState(true);
  const [classroom, setClassroom] = useState("All classrooms");
  const [pulse, setPulse] = useState<ReadingSession[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    loadStudents().then((result) => {
      setStudents(result.students);
      setDemo(result.demo);
      loadClassPulse(result.students).then(setPulse);
    });
    loadBooks().then(setBooks);
  }, []);
  const classrooms = [
    "All classrooms",
    ...Array.from(new Set(students.map((student) => student.classroom_name))),
  ];
  const visibleStudents =
    classroom === "All classrooms"
      ? students
      : students.filter((student) => student.classroom_name === classroom);
  const atRisk = visibleStudents.filter(
    (student) => student.risk_level === "at_risk",
  );
  const improving = visibleStudents.filter(
    (student) => student.risk_level === "on_track",
  );
  return (
    <AppShell demo={demo}>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Monday, August 28 · {classroom}</span>
            <h1>Good morning, Alex.</h1>
            <p>Here’s who may need a closer look this week.</p>
          </div>
          <div className="heading-actions">
            <select
              className="classroom-select"
              value={classroom}
              onChange={(event) => setClassroom(event.target.value)}
              aria-label="Filter by classroom"
            >
              {classrooms.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              className="primary-button"
              onClick={() => {
                setShowLogForm(true);
                setLogged(false);
              }}
            >
              <Icon name="plus" size={16} /> Log a reading session
            </button>
          </div>
        </div>
        {showLogForm && (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setShowLogForm(false)}
          >
            <section
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-session-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setShowLogForm(false)}
                aria-label="Close"
              >
                ×
              </button>
              <span className="eyebrow">Quick entry</span>
              <h2 id="log-session-title">Log a reading session</h2>
              {logged ? (
                <>
                  <p className="modal-success">
                    Reading session saved for this demo classroom.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setShowLogForm(false)}
                  >
                    Close
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setLogged(true);
                  }}
                >
                  <label>
                    Student
                    <select required defaultValue="">
                      <option value="" disabled>
                        Choose a student
                      </option>
                      {visibleStudents.map((student) => (
                        <option key={student.id}>{student.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Minutes read
                    <input type="number" min="1" defaultValue="20" required />
                  </label>
                  <label>
                    Words per minute
                    <input type="number" min="1" defaultValue="90" required />
                  </label>
                  <button className="primary-button" type="submit">
                    Save session
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
        <section className="metric-grid">
          <div className="metric-card">
            <span className="metric-label">Students in view</span>
            <strong>{visibleStudents.length}</strong>
            <span className="metric-note">{classroom}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">
              <span className="metric-icon green">
                <Icon name="trend" size={15} />
              </span>
              Moving forward
            </span>
            <strong>{improving.length}</strong>
            <span className="metric-note positive">+3 from last week</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">
              <span className="metric-icon amber">◌</span>Steady
            </span>
            <strong>
              {
                visibleStudents.filter(
                  (student) => student.risk_level === "watch",
                ).length
              }
            </strong>
            <span className="metric-note">Worth keeping an eye on</span>
          </div>
          <div className="metric-card attention">
            <span className="metric-label">
              <span className="metric-icon amber">!</span>Needs a closer look
            </span>
            <strong>{atRisk.length}</strong>
            <span className="metric-note">Small steps can help now</span>
          </div>
        </section>
        <div className="content-grid">
          <section className="paper-card attention-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Priority today</span>
                <h2>Needs a closer look</h2>
              </div>
              <Link href="/students" className="text-link">
                View all <Icon name="arrow" size={15} />
              </Link>
            </div>
            <p className="section-intro">
              These students’ recent reading direction has changed. A quick
              check-in now can make a big difference.
            </p>
            <div className="student-list">
              {atRisk.slice(0, 4).map((student) => (
                <Link
                  href={`/students/${student.id}`}
                  className="student-row"
                  key={student.id}
                >
                  <span className="student-avatar">
                    {student.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span className="student-main">
                    <strong>{student.name}</strong>
                    <small>
                      Grade {student.grade} · Last read{" "}
                      {formatDate(student.last_session)}
                    </small>
                  </span>
                  <span className="mini-trend">
                    <span className="down-line">↘</span>
                    <small>Reading pace</small>
                    <strong>{student.wpm_slope.toFixed(2)} / day</strong>
                  </span>
                  <span className="status-tag alert">Needs a closer look</span>
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
            </div>
          </section>
          <section className="paper-card pulse-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Class pulse</span>
                <h2>Reading is finding its rhythm</h2>
              </div>
              <button className="period-select">Last 8 weeks ⌄</button>
            </div>
            <div className="pulse-legend">
              <span>
                <i className="legend-dot green-dot" />
                Reading pace
              </span>
              <span>
                <i className="legend-dot sand-dot" />
                Class average
              </span>
            </div>
            <TrendChart sessions={pulse} dataKey="wpm" height={213} />
            <div className="pulse-footer">
              <span>
                <strong>+8%</strong> average pace
              </span>
              <span>Compared with last month</span>
            </div>
          </section>
        </div>
        <div className="content-grid lower-grid">
          <section className="paper-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A little momentum</span>
                <h2>Students moving forward</h2>
              </div>
              <Link href="/students" className="text-link">
                See students <Icon name="arrow" size={15} />
              </Link>
            </div>
            <div className="improving-list">
              {improving.slice(0, 3).map((student, index) => (
                <Link
                  href={`/students/${student.id}`}
                  className="improving-row"
                  key={student.id}
                >
                  <span className={`student-avatar avatar-${index + 2}`}>
                    {student.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{student.name}</strong>
                    <small>
                      Reading pace up {Math.round(5 + index * 3)}% this month
                    </small>
                  </span>
                  <span className="positive-arrow">↗</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="paper-card reads-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">From the shelf</span>
                <h2>Popular across the class</h2>
              </div>
              <Link href="/library" className="text-link">
                Browse library <Icon name="arrow" size={15} />
              </Link>
            </div>
            <div className="book-strip">
              {books.slice(0, 3).map((book) => (
                <Link href="/library" className="book-mini" key={book.id}>
                  <span
                    className="book-cover"
                    style={{
                      background: book.cover_url
                        ? `url(${book.cover_url}) center/cover`
                        : book.cover,
                    }}
                  >
                    <span>
                      {book.cover_url
                        ? ""
                        : book.title.split(" ").slice(0, 3).join(" ")}
                    </span>
                  </span>
                  <span>
                    <strong>{book.title}</strong>
                    <small>
                      {book.genre} · Level {book.lexile_level}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
