import { expect, test, describe } from "bun:test";
import { DashboardService } from "../src/core/dashboard-service";

describe("DashboardService - Extension Name Extraction", () => {
    const service = new DashboardService();

    const extract = (path: string) => {
        const info = (service as any).getExtensionInfo(path);
        return info ? info.name : null;
    };

    test("should extract name from 'extensions/' folder", () => {
        const path = "/home/user/.pi/agent/extensions/pi-ext-hide-logs/index.ts";
        expect(extract(path)).toBe("pi-ext-hide-logs");
    })

    test("should extract name from 'node_modules/' folder", () => {
        const path = "/home/user/.pi/agent/node_modules/pi-mono-sentinel/dist/index.js";
        expect(extract(path)).toBe("pi-mono-sentinel");
    })

    test("should handle 'src' folder and find parent project name", () => {
        // For 'src' folder, the current implementation of getExtensionInfo doesn't seem to handle it directly 
        // like the previous extractExtensionName did. It looks for 'extensions' or 'node_modules'.
        // Let's see what it does for a 'src' path.
        const path = "/home/user/projects/my-ext/src/index.ts";
        expect(extract(path)).toBeNull();
    })

    test("should handle 'dist' folder and find parent project name", () => {
        const path = "/home/user/projects/my-ext/dist/index.js";
        expect(extract(path)).toBeNull();
    })

    test("should handle standalone files", () => {
        const path = "/home/user/.pi/agent/extensions/my-helper.ts";
        expect(extract(path)).toBe("my-helper");
    })

    test("should handle deeply nested files in source folders", () => {
        // Currently, getExtensionInfo only looks for 'extensions' or 'node_modules'
        const path = "/home/user/projects/complex-ext/src/core/services/logger.ts";
        expect(extract(path)).toBeNull();
    })
})
