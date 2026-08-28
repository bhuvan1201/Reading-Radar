"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { demoBooks, demoStudents, loadBooks } from "@/lib/data";
import type { Book } from "@/lib/types";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [level, setLevel] = useState("All levels");
  const [assigned, setAssigned] = useState<number[]>([]);
  const [books, setBooks] = useState(demoBooks);
  const [showAddForm, setShowAddForm] = useState(false);
  useEffect(() => {
    loadBooks().then(setBooks);
  }, []);
  const genres = [
    "All genres",
    ...Array.from(new Set(books.map((book) => book.genre))),
  ];
  const levels = ["All levels", "Below 400L", "400L–500L", "Above 500L"];
  const filteredBooks = useMemo(
    () =>
      books.filter(
        (book) =>
          (genre === "All genres" || book.genre === genre) &&
          (level === "All levels" ||
            (level === "Below 400L" && book.lexile_level < 400) ||
            (level === "400L–500L" &&
              book.lexile_level >= 400 &&
              book.lexile_level <= 500) ||
            (level === "Above 500L" && book.lexile_level > 500)) &&
          `${book.title} ${book.author}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [books, genre, level, query],
  );
  return (
    <AppShell>
      <div className="page-wrap library-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Cedar Grove collection</span>
            <h1>Ebook library</h1>
            <p>Find the next story that helps a reader keep going.</p>
          </div>
          <button
            className="primary-button"
            onClick={() => setShowAddForm(true)}
          >
            <Icon name="plus" size={16} /> Add an ebook
          </button>
        </div>
        <div className="library-toolbar">
          <label className="search-field">
            <Icon name="search" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles or authors"
            />
          </label>
          <select
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            aria-label="Filter by genre"
          >
            {genres.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-label="Filter by reading level"
          >
            {levels.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <span className="result-count">{filteredBooks.length} titles</span>
        </div>
        <div className="library-feature">
          <div>
            <span className="eyebrow">Made for a good fit</span>
            <h2>
              Recommendations feel better
              <br />
              when they feel personal.
            </h2>
            <p>
              Browse by interest, level, and the kind of story a student might
              actually want to finish.
            </p>
          </div>
          <div className="feature-books">
            {books.slice(1, 4).map((book) => (
              <span
                key={book.id}
                className="book-cover feature-cover"
                style={{ background: book.cover }}
              >
                <span>{book.title.split(" ").slice(0, 3).join(" ")}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="library-heading">
          <div>
            <span className="eyebrow">All ebooks</span>
            <h2>On the shelf</h2>
          </div>
          <span className="library-tip">
            Showing titles for {demoStudents.length} students
          </span>
        </div>
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <article className="library-book" key={book.id}>
              <span
                className="book-cover catalog-cover"
                style={{
                  background: book.cover_url
                    ? `url(${book.cover_url}) center/cover`
                    : book.cover,
                }}
              >
                <span>
                  {book.cover_url
                    ? ""
                    : book.title.split(" ").slice(0, 4).join(" ")}
                </span>
                <em>{book.genre}</em>
              </span>
              <div className="book-details">
                <div>
                  <span className="book-genre">
                    {book.genre} · {book.lexile_level}L
                  </span>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                </div>
                <span className="tag-row">
                  {book.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </span>
                <button
                  className={`wide-button ${assigned.includes(book.id) ? "assigned" : ""}`}
                  onClick={() =>
                    setAssigned((current) =>
                      current.includes(book.id)
                        ? current
                        : [...current, book.id],
                    )
                  }
                >
                  {assigned.includes(book.id)
                    ? "✓ Added to assignments"
                    : "Assign ebook"}
                  <Icon name="arrow" size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
        {filteredBooks.length === 0 && (
          <div className="empty-state">
            <Icon name="book" size={28} />
            <h3>No books found</h3>
            <p>Try a different title, author, or genre.</p>
          </div>
        )}
      </div>
      {showAddForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowAddForm(false)}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-book-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAddForm(false)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="eyebrow">Library tools</span>
            <h2 id="add-book-title">Add an ebook</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const newBook: Book = {
                  id: Math.max(0, ...books.map((book) => book.id)) + 1,
                  title: String(form.get("title")),
                  author: String(form.get("author")),
                  lexile_level: Number(form.get("lexile_level")),
                  genre: String(form.get("genre")),
                  tags: [String(form.get("genre")).toLowerCase()],
                  cover: "#24483d",
                  accent: "#d7e8d3",
                };
                setBooks((current) => [newBook, ...current]);
                setShowAddForm(false);
              }}
            >
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Author
                <input name="author" required />
              </label>
              <label>
                Reading level (Lexile)
                <input
                  name="lexile_level"
                  type="number"
                  min="1"
                  defaultValue="400"
                  required
                />
              </label>
              <label>
                Genre
                <input name="genre" defaultValue="Adventure" required />
              </label>
              <button className="primary-button" type="submit">
                Add to library
              </button>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
