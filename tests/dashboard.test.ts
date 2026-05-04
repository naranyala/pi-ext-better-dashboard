import { expect, test, describe } from "bun:test";
import { DashboardService } from "../src/core/dashboard-service";

describe("DashboardService - Extension Name Extraction", () => {
    const service = new DashboardService();

    // We need to make extractExtensionName public or use a helper for testing
    // For now, I'll use a trick to access private method or I should have made it public.
    // Let's assume I'll change it to public in a moment or cast to any.
    const extract = (path: string) => {
        const set = new Set<string>();
        (service as any).extractExtensionName(path, set);
        return Array.from(set)[0];
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
        const path = "/home/user/projects/my-ext/src/index.ts";
        expect(extract(path)).toBe("my-ext");
    })

    test("should handle 'dist' folder and find parent project name", () => {
        const path = "/home/user/projects/my-ext/dist/index.js";
        expect(extract(path)).toBe("my-ext");
    })

    test("should handle standalone files", () => {
        const path = "/home/user/.pi/agent/extensions/my-helper.ts";
        expect(extract(path)).toBe("my-helper");
    })

    test("should handle deeply nested files in source folders", () => {
        const path = "/home/user/projects/complex-ext/src/core/services/logger.ts";
        expect(extract(path)).toBe("complex-ext");
    })
})
