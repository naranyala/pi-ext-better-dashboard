/**
 * =================================================================================
 * SERVICES CONTAINER
 * =================================================================================
 *
 * This container holds all the core services used across the extension.
 *
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Logger } from "./logger";
import { DashboardService } from "./dashboard-service";

/**
 * Interface defining the available services in the extension.
 */
export interface Services {
  readonly api: ExtensionAPI;
  readonly logger: Logger;
  readonly silence: DashboardService;
}

/**
 * Concrete implementation of the Services container.
 */
export class ServiceContainer implements Services {
  public readonly api: ExtensionAPI;
  public readonly logger: Logger;
  public readonly silence: DashboardService;

  constructor(api: ExtensionAPI) {
    this.api = api;
    this.logger = new Logger();
    this.silence = new DashboardService();
  }
}
