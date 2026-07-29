import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

/** Port of `ConversationsChartWidget` — conversations grouped by day, last 30 days. */
export const GET = withAdminAuth(async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - 29);

  const rows = await prisma.$queryRaw<{ date: Date; count: number | bigint }[]>`
    SELECT CAST(created_at AS DATE) AS [date], COUNT(*) AS [count]
    FROM conversations
    WHERE created_at >= ${start}
    GROUP BY CAST(created_at AS DATE)
    ORDER BY [date] ASC
  `;

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(new Date(row.date).toISOString().slice(0, 10), Number(row.count));
  }

  const labels: string[] = [];
  const values: number[] = [];

  for (let i = 29; i >= 0; i--) {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    labels.push(day.toLocaleDateString("es-ES", { month: "short", day: "2-digit" }));
    values.push(counts.get(key) ?? 0);
  }

  return NextResponse.json({ labels, values });
});
