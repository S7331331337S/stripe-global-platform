import type { NextApiRequest, NextApiResponse } from "next";
import { createJevFromEnv } from "@/jev/client";
import { getLedger } from "@/ledger/memory";
import { stripeCheckout } from "@/stripe/checkout";
import { stripeConnect } from "@/stripe/connect";
import { runTool, TOOL_NAMES, type ToolName } from "@/tools/index";

function isToolName(value: unknown): value is ToolName {
  return typeof value === "string" && (TOOL_NAMES as readonly string[]).includes(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const expected = process.env.AGENT_SHARED_SECRET;
  const provided = req.headers["x-agent-secret"];
  if (!expected || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const name = req.body?.tool;
  if (!isToolName(name)) {
    res.status(400).json({ error: "Unknown tool" });
    return;
  }

  try {
    const data = await runTool(name, req.body?.input ?? {}, {
      ledger: getLedger(),
      ports: { connect: stripeConnect, checkout: stripeCheckout },
      jev: createJevFromEnv(),
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Tool failed",
    });
  }
}
