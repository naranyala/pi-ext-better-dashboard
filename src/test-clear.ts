import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    process.stdout.write('\x1b[2J\x1b[H');
    ctx.ui.notify("Screen cleared!", "info");
  });
}
