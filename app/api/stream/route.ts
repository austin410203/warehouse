import { dbMissing, getDb, tickAndLoad } from '../../../lib/server-sim';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/stream → Server-Sent Events, pushes the world every 1.5 s for ~25 s,
// then closes; EventSource reconnects automatically (Vercel has no WebSockets).
export async function GET(req: Request) {
  const db = getDb();
  if (!db) return dbMissing();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const until = Date.now() + 25_000;
      while (Date.now() < until && !req.signal.aborted) {
        try {
          const world = await tickAndLoad(db);
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ world })}\n\n`));
        } catch (e) {
          controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify(String(e))}\n\n`));
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      controller.enqueue(enc.encode('retry: 500\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' },
  });
}
