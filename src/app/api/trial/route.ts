import { BriefInputSchema } from "@/lib/schemas/brief";
import { runTrial } from "@/lib/trial/orchestrator";

export const runtime = "nodejs";
// A full trial runs 4 sequential Gemini calls and took 25-40s in local eval
// runs. Vercel's default function timeout (10s on Hobby) would kill this
// mid-trial; 60 is the max Hobby allows and covers the observed range with
// headroom. Raise further if deploying on a plan that allows it.
export const maxDuration = 60;

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = BriefInputSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runTrial(parsed.data)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
