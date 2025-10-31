import { NextResponse } from "next/server";

export async function GET() {
  // Static catalog; curve params shown for UI only
  const toys = [
    { toyId: 1, emoji: "🧸", name: "Plush Bear", minPrice: 0.01, maxPrice: 100, r: 1.15 },
    { toyId: 2, emoji: "🚗", name: "Race Car",  minPrice: 0.05, maxPrice: 100, r: 1.10 },
    { toyId: 3, emoji: "🪀", name: "Yo-Yo",      minPrice: 0.10, maxPrice: 100, r: 1.12 },
    { toyId: 4, emoji: "🧩", name: "Puzzle",     minPrice: 0.02, maxPrice: 100, r: 1.08 },
    { toyId: 5, emoji: "🪁", name: "Kite",       minPrice: 0.03, maxPrice: 100, r: 1.09 },
    { toyId: 6, emoji: "🏎️", name: "Kart",       minPrice: 0.20, maxPrice: 100, r: 1.07 },
  ];
  return NextResponse.json({ toys });
}
