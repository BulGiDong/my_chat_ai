import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const tonePromptPath = join(process.cwd(), "tone_prompt.md");

export const TONE_PROMPT = readFileSync(tonePromptPath, "utf8").trim();
