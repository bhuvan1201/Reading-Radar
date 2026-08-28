"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const prompts = ["Why was this student flagged?", "What should I assign next?", "Who improved this week?"];

export function RadarChat({ studentName, studentId }: { studentName?: string; studentId?: number }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({ name: studentName, id: studentId });
  const [messages, setMessages] = useState<Array<{ from: "radar" | "teacher"; text: string }>>([]);

  useEffect(() => {
    function handleOpen(event: Event) {
      const detail = (event as CustomEvent<{ studentName?: string; studentId?: number }>).detail;
      setContext({ name: detail.studentName, id: detail.studentId });
      setOpen(true);
    }
    window.addEventListener("open-radar", handleOpen);
    return () => window.removeEventListener("open-radar", handleOpen);
  }, []);

  function ask(prompt: string) {
    const name = context.name ?? "your class";
    const answer = prompt.includes("improved")
      ? "Five students are moving in a positive direction this week. Maya Chen and Theo Wilson have made the clearest gains in both pace and comprehension."
      : prompt.includes("assign")
        ? `${name === "your class" ? "For your students" : `${name} would benefit from`} a short, interest-led ebook at their current level. I found a good match in the Ebook Library.`
        : `${name}'s recent sessions show a change in direction rather than a single low score. I would suggest a quick check-in and one approachable ebook before making a larger intervention.`;
    setMessages((current) => [...current, { from: "teacher", text: prompt }, { from: "radar", text: answer }]);
  }

  return <div className="radar-chat">{open && <section className="chat-panel" aria-label="Ask Radar assistant"><div className="chat-header"><div><span className="chat-spark"><Icon name="spark" size={15} /></span><span><strong>Ask Radar</strong><small>{context.name ? `Looking at ${context.name}` : "Your reading copilot"}</small></span></div><button className="close-button" onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={17} /></button></div><div className="chat-body"><div className="chat-welcome"><strong>What would be helpful?</strong><p>I can help turn a reading trend into a thoughtful next step. Suggestions are here to support your judgment.</p></div>{messages.map((message, index) => <div key={`${message.text}-${index}`} className={`chat-message ${message.from}`}>{message.text}</div>)}{messages.length === 0 && <div className="prompt-list">{prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}<Icon name="arrow" size={14} /></button>)}</div>}{messages.length > 0 && <div className="prompt-list compact">{prompts.filter((prompt) => !messages.some((message) => message.text === prompt)).slice(0, 2).map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}<Icon name="arrow" size={14} /></button>)}</div>}</div><div className="chat-input"><input placeholder="Ask about a student..." aria-label="Ask about a student" /><button aria-label="Send"><Icon name="arrow" size={16} /></button></div></section>}<button className={`chat-launcher ${open ? "open" : ""}`} onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Ask Radar" : "Open Ask Radar"}><Icon name={open ? "close" : "spark"} size={20} /><span>{!open && "Ask Radar"}</span></button></div>;
}
