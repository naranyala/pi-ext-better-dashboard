import { expect, test, describe, beforeEach, afterEach, beforeAll } from "bun:test";
import { LogInterceptor } from "../src/core/log-interceptor";

describe("LogInterceptor", () => {
    let logs: string[] = [];

    beforeAll(() => {
        LogInterceptor.patch();
    })

    beforeEach(() => {
        logs = [];
        (LogInterceptor as any).originalConsole.log = (...args: any[]) => {
            logs.push(args.join(" "));
        };
        (LogInterceptor as any).originalConsole.error = (...args: any[]) => {
            logs.push(args.join(" "));
        };
    })

    afterEach(() => {
        LogInterceptor.setSilence(false);
    })

    test("should replace [INFO] with a formatted extension name when pattern matches", () => {
        console.log("[INFO] Rigorous NixOS Companion loaded.");
        expect(logs[0]).toMatch(/\[Rigorous NixOS Companion\]/);
        expect(logs[0]).not.toContain("[INFO]");
    })

    test("should use [Extension] as default when [INFO] name cannot be parsed", () => {
        console.log("[INFO] something happened");
        expect(logs[0]).toContain("[Extension]");
    })

    test("should beautify [SYSTEM] tags", () => {
        console.log("[SYSTEM] Session started.");
        expect(logs[0]).toContain("[SYSTEM]");
        expect(logs[0]).toContain("\x1b[31m");
    })

    test("should tag tagless initialization messages", () => {
        console.log("Memory Extension Initialized.");
        expect(logs[0]).toContain("[Memory]");
    })

    test("should silence logs when silenceMode is enabled", () => {
        LogInterceptor.setSilence(true);
        console.log("This should be silenced");
        expect(logs.length).toBe(0);
    })

    test("should allow errors to pass through even in silence mode", () => {
        LogInterceptor.setSilence(true);
        
        (LogInterceptor as any).originalConsole.error = (...args: any[]) => {
            logs.push(args.join(" "));
        };

        console.error("Critical failure");
        expect(logs.length).toBe(1);
    })
})
