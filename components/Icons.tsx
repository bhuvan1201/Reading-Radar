type IconProps = { size?: number };

const paths: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  users: "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-5a2.5 2.5 0 0 1 0 5m1 4h.5a3.5 3.5 0 0 1 3.5 3.5V20",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm0 0v16M8 7h8M8 11h6",
  search: "m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  chevron: "m9 18 6-6-6-6",
  spark: "m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 12 .6 1.9L21.5 18l-1.9.6L19 20.5l-.6-1.9-1.9-.6 1.9-.6.6-1.9Z",
  trend: "M4 16 9 11l4 3 7-8M15 6h5v5",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  plus: "M12 5v14m-7-7h14",
  close: "m6 6 12 12M18 6 6 18",
};

export function Icon({ name, size = 18 }: IconProps & { name: keyof typeof paths }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
