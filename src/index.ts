/**
 * =================================================================================
 * MAIN EXTENSION ENTRY POINT
 * =================================================================================
 *
 * This extension hides startup logs by default and clears the terminal on session start.
 *
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ServiceContainer } from "./core/services";
import { LogInterceptor } from "./core/log-interceptor";

export default function (api: ExtensionAPI) {
  // Patch console immediately to intercept all subsequent logs
  LogInterceptor.patch();

  const services = new ServiceContainer(api);

  api.on("session_start", async (_event, ctx) => {

    try {
      // 1. Clear everything immediately
      services.silence.clearScreen(ctx);

      // 2. Stop silencing logs so we can print the welcome and list
      LogInterceptor.setSilence(false);

      // 3. Print the comprehensive welcome message
      services.silence.printWelcome(api, ctx);

      // 4. Print extensions in a clean list format
      services.silence.printExtensionList(api);
    } catch (e: any) {
      services.logger.error(`Startup silence failed: ${e.message}`, ctx);
    }
  });

  // Removed the .info() call here to prevent any startup logs
}
