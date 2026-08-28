"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReadingSession } from "@/lib/types";

export function TrendChart({ sessions, dataKey, color = "#2b6957", height = 220 }: { sessions: ReadingSession[]; dataKey: "wpm" | "comprehension_score"; color?: string; height?: number }) {
  const data = sessions.map((session) => ({ date: new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: session[dataKey] }));
  return <div className="chart-wrap" style={{ height }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id={`fill-${dataKey}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.22} /><stop offset="100%" stopColor={color} stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8e4da" /><XAxis dataKey="date" tick={{ fill: "#8b8b80", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" /><YAxis tick={{ fill: "#8b8b80", fontSize: 11 }} tickLine={false} axisLine={false} width={35} /><Tooltip contentStyle={{ border: "1px solid #e3dfd4", borderRadius: 10, background: "#fffdf9", fontSize: 12 }} formatter={(value: number) => [dataKey === "wpm" ? `${value} wpm` : `${value}%`, dataKey === "wpm" ? "Reading speed" : "Comprehension"]} /><Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#fill-${dataKey})`} dot={false} activeDot={{ r: 4, fill: color, stroke: "#fffdf9", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>;
}
