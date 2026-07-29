import { tool } from "@opencode-ai/plugin";
import { OrganicRddError, createOrganicRdd } from "../lib/organic-rdd.js";

function response(action) {
  try {
    return JSON.stringify({ ok: true, result: action() }, null, 2);
  } catch (error) {
    const known = error instanceof OrganicRddError;
    return JSON.stringify({
      ok: false,
      error: {
        code: known ? error.code : "internal_error",
        message: known ? error.message : "Organic RDD operation failed.",
        ...(known && Object.keys(error.details).length ? { details: error.details } : {}),
      },
    }, null, 2);
  }
}

export const organicRddPlugin = async () => {
  const rdd = createOrganicRdd({ storeDir: process.env.OPENCODE_ORGANIC_RDD_DIR });

  return {
    tool: {
      review_mode_get: tool({
        description: "Read the Organic RDD mode. Invalid state fails closed as managed.",
        args: {},
        async execute() {
          return response(() => rdd.getMode());
        },
      }),

      review_mode_set: tool({
        description: "Set Organic RDD to managed or disabled. Disabled means unmanaged, never approved.",
        args: {
          mode: tool.schema.enum(["managed", "disabled"]).describe("Organic RDD review mode"),
        },
        async execute(args) {
          return response(() => rdd.setMode(args.mode));
        },
      }),

      review_start: tool({
        description: "Freeze explicit candidate files, classify risk, and create a canonical Organic RDD receipt.",
        args: {
          feature_id: tool.schema.string().describe("Project-local feature or change identifier"),
          files: tool.schema.array(tool.schema.string()).describe("Project-relative or absolute candidate file paths"),
        },
        async execute(args, ctx) {
          return response(() => rdd.start({
            feature_id: args.feature_id,
            project_path: ctx.directory,
            files: args.files,
          }));
        },
      }),

      review_status: tool({
        description: "Read canonical review state, missing evidence, and candidate freshness.",
        args: {
          review_id: tool.schema.string().describe("Canonical review receipt ID"),
        },
        async execute(args, ctx) {
          return response(() => rdd.status(args.review_id, ctx.directory));
        },
      }),

      review_capture: tool({
        description: "Capture or replace one required review lens result for the frozen candidate.",
        args: {
          review_id: tool.schema.string().describe("Canonical review receipt ID"),
          lens: tool.schema.enum(["code-review", "verifier", "security-review", "architecture-review"]),
          status: tool.schema.enum(["pass", "fail", "blocked"]),
          summary: tool.schema.string().optional().default("").describe("Concise findings summary"),
          evidence: tool.schema.array(tool.schema.string()).optional().default([]).describe("Commands, files, or finding references"),
        },
        async execute(args, ctx) {
          return response(() => rdd.capture({ ...args, project_path: ctx.directory }));
        },
      }),

      review_verify: tool({
        description: "Record verification status and evidence for the frozen candidate.",
        args: {
          review_id: tool.schema.string().describe("Canonical review receipt ID"),
          status: tool.schema.enum(["pass", "fail", "blocked"]),
          evidence: tool.schema.array(tool.schema.string()).optional().default([]).describe("Executed checks and concrete outcomes"),
        },
        async execute(args, ctx) {
          return response(() => rdd.verify({ ...args, project_path: ctx.directory }));
        },
      }),

      review_finalize: tool({
        description: "Finalize a fresh receipt. Approval requires every required lens and passing verification.",
        args: {
          review_id: tool.schema.string().describe("Canonical review receipt ID"),
        },
        async execute(args, ctx) {
          return response(() => rdd.finalize(args.review_id, ctx.directory));
        },
      }),

      review_gate: tool({
        description: "Validate an existing receipt without launching reviewers or verification.",
        args: {
          review_id: tool.schema.string().describe("Canonical review receipt ID"),
          strict_manifest: tool.schema.boolean().optional().default(false).describe("Fail if Git reports changed files outside the explicit manifest"),
        },
        async execute(args, ctx) {
          return response(() => rdd.gate(args.review_id, ctx.directory, { strict_manifest: args.strict_manifest }));
        },
      }),
    },
  };
};

export default organicRddPlugin;
