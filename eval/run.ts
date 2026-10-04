import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runTrial, type TrialEvent } from "../src/lib/trial/orchestrator";
import { BriefInputSchema } from "../src/lib/schemas/brief";

// GEMINI_API_KEY must already be in process.env by the time this module's
// imports resolve, since agents/client.ts reads it at import time — the
// `--env-file` flag on the `eval` npm script handles that. A loader inside
// this file would run too late: ES module imports evaluate before this
// file's own top-level code does.

type BrandFixture = {
  name: string;
  brief: string;
  tagline?: string;
  paletteHex: string[];
  siteUrl?: string;
};

type BrandResult = {
  name: string;
  durationMs: number;
  chargeCount: number;
  contrastFailures: number;
  rebuttalCount: number;
  juryVotes: string;
  revisionCount: number;
  error?: string;
};

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "GEMINI_API_KEY is not set. Add it to .env.local or export it before running `npm run eval`."
    );
    process.exit(1);
  }

  const fixturesPath = join(process.cwd(), "eval", "brands.json");
  const fixtures: BrandFixture[] = JSON.parse(readFileSync(fixturesPath, "utf-8"));

  const results: BrandResult[] = [];

  for (const fixture of fixtures) {
    const parsed = BriefInputSchema.safeParse({
      brief: fixture.brief,
      tagline: fixture.tagline,
      paletteHex: fixture.paletteHex,
      siteUrl: fixture.siteUrl || undefined,
    });

    if (!parsed.success) {
      results.push({
        name: fixture.name,
        durationMs: 0,
        chargeCount: 0,
        contrastFailures: 0,
        rebuttalCount: 0,
        juryVotes: "",
        revisionCount: 0,
        error: `Fixture failed BriefInputSchema: ${parsed.error.message}`,
      });
      continue;
    }

    const started = Date.now();
    let charges = 0;
    let contrastFailures = 0;
    let rebuttals = 0;
    let juryVotes: string[] = [];
    let revisions = 0;
    let error: string | undefined;

    console.log(`\nRunning trial: ${fixture.name}`);
    for await (const event of runTrial(parsed.data)) {
      logEvent(event);
      switch (event.type) {
        case "evidence":
          contrastFailures = event.data.failures.length;
          break;
        case "charges":
          charges = event.data.charges.length;
          break;
        case "rebuttals":
          rebuttals = event.data.rebuttals.length;
          break;
        case "votes":
          juryVotes = event.data.votes.map((v) => v.verdict);
          break;
        case "verdict":
          revisions = event.data.revisions.length;
          break;
        case "error":
          error = event.data.message;
          break;
      }
    }

    results.push({
      name: fixture.name,
      durationMs: Date.now() - started,
      chargeCount: charges,
      contrastFailures,
      rebuttalCount: rebuttals,
      juryVotes: juryVotes.join(", "),
      revisionCount: revisions,
      error,
    });
  }

  writeFileSync(
    join(process.cwd(), "eval", "results.json"),
    JSON.stringify(results, null, 2)
  );
  writeFileSync(join(process.cwd(), "eval", "results.md"), toMarkdownTable(results));

  console.log("\nWrote eval/results.json and eval/results.md");
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    console.error(`${failed.length}/${results.length} brands errored.`);
    process.exit(1);
  }
}

function logEvent(event: TrialEvent) {
  console.log(`  [${event.type}]`);
}

function toMarkdownTable(results: BrandResult[]): string {
  const header =
    "| Brand | Charges | Contrast failures | Rebuttals | Jury votes | Revisions | Duration (ms) | Error |\n" +
    "|---|---|---|---|---|---|---|---|\n";
  const rows = results
    .map(
      (r) =>
        `| ${r.name} | ${r.chargeCount} | ${r.contrastFailures} | ${r.rebuttalCount} | ${r.juryVotes} | ${r.revisionCount} | ${r.durationMs} | ${r.error ?? ""} |`
    )
    .join("\n");
  return `# Eval results\n\n${header}${rows}\n`;
}

main();
