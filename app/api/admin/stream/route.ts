import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SSE: cada nova linha em `votes` (INSERT) emite um evento `vote`
 * com `{category_id, nominee_id}`. O cliente usa pra incrementar
 * contagens localmente sem repollar tudo.
 */
export async function GET() {
  if (!isAdmin()) return new Response("unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let channel: ReturnType<typeof supabaseAdmin.channel> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* connection closed */
        }
      };
      send("hello", { at: Date.now() });

      channel = supabaseAdmin
        .channel("admin-votes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on(
          "postgres_changes" as any,
          { event: "INSERT", schema: "public", table: "votes" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const r = payload?.new ?? {};
            send("vote", {
              category_id: Number(r.category_id),
              nominee_id: Number(r.nominee_id),
            });
          },
        );
      try {
        await channel.subscribe();
      } catch {
        send("error", { message: "subscribe failed" });
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* ignore */
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (channel) {
        try {
          supabaseAdmin.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
