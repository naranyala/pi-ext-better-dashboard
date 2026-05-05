import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";

export class DashboardService {
    private readonly settingsPath = join(os.homedir(), ".pi", "agent", "settings.json");

    constructor() {
        this.ensureQuietStartup();
    }

    private ensureQuietStartup() {
        try {
            const data = readFileSync(this.settingsPath, "utf-8");
            const settings = JSON.parse(data);
            if (settings.quietStartup !== true) {
                settings.quietStartup = true;
                writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
            }
        } catch (e) {}
    }

    public clearScreen(ctx?: ExtensionContext) {
        // Don't clear screen - let the welcome message print on top of existing content
        // The TUI dashboard is already rendered at this point
    }

    public printWelcome(api: ExtensionAPI, ctx: ExtensionContext) {
        const sessionName = api.getSessionName() || "Unnamed Session";
        const sessionFile = ctx.sessionManager?.getSessionFile?.() ?? "Ephemeral";
        const entryCount = ctx.sessionManager?.getEntries?.()?.length ?? 0;

        const platform = `${os.platform()} ${os.arch()}`;
        const nodeVer = process.version;
        const cwd = process.cwd();
        const user = os.userInfo().username;
        const uptime = this.formatUptime(os.uptime());
        
        const load = (typeof os.loadavg === 'function') ? os.loadavg()[0].toFixed(2) : 'N/A';
        const thinkingLevel = api.getThinkingLevel();

        const tools = api.getAllTools();
        const commands = api.getCommands();
        const extensions = this.getLoadedExtensions(api);

        const welcome = `
\x1b[1m\x1b[34mWelcome to \x1b[0mpi coding agent\x1b[0m
\x1b[2mThe ultimate AI coding companion\x1b[0m

\x1b[1m\x1b[33m🤖 MODEL INFO\x1b[0m
  \x1b[32m●\x1b[0m Thinking Level: \x1b[1m${thinkingLevel}\x1b[0m

\x1b[1m\x1b[33m📂 SESSION\x1b[0m
  \x1b[32m●\x1b[0m Name: ${sessionName}
  \x1b[32m●\x1b[0m File: \x1b[2m${sessionFile}\x1b[0m
  \x1b[32m●\x1b[0m History: ${entryCount} entries

\x1b[1m\x1b[33m⚙️ SYSTEM\x1b[0m
  \x1b[32m●\x1b[0m OS: ${platform} | Node: ${nodeVer}
  \x1b[32m●\x1b[0m User: ${user} | Uptime: ${uptime}
  \x1b[32m●\x1b[0m CPU Load: ${load}
  \x1b[32m●\x1b[0m Path: \x1b[2m${cwd}\x1b[0m

\x1b[1m\x1b[33m🛠️ CAPABILITIES\x1b[0m
  \x1b[32m●\x1b[0m Total Tools: ${tools.length}
  \x1b[32m●\x1b[0m Total Commands: ${commands.length}
  \x1b[32m●\x1b[0m Extensions: ${extensions.length}

${extensions.length > 0 ? `Loaded Extensions:\n${extensions.map(ext => `  \x1b[32m●\x1b[0m ${ext}`).join('\n')}\n` : ''}
`;
        console.log(welcome);
    }

    private getLoadedExtensions(api: ExtensionAPI): string[] {
        const extensionNames = new Set<string>();

        // 1. Get all tools
        const tools = api.getAllTools();
        for (const tool of tools) {
            const name = this.extractExtensionNameFromPath(tool.sourceInfo.path);
            if (name && name !== "@mariozechner/pi-coding-agent") extensionNames.add(name);
        }

        // 2. Get all commands
        const commands = api.getCommands();
        for (const command of commands) {
            const name = this.extractExtensionNameFromPath(command.sourceInfo.path);
            if (name && name !== "@mariozechner/pi-coding-agent") extensionNames.add(name);
        }

        // Sort alphabetically
        return Array.from(extensionNames).sort((a, b) => a.localeCompare(b));
    }

    private extractExtensionNameFromPath(path: string): string | undefined {
        // Heuristic 1: node_modules
        if (path.includes('node_modules/')) {
            const parts = path.split('node_modules/');
            if (parts.length > 1) {
                const remaining = parts[1];
                const firstPart = remaining.split('/')[0];
                if (firstPart.startsWith('@')) {
                    const secondPart = remaining.split('/')[1];
                    if (secondPart) {
                        return `${firstPart}/${secondPart}`;
                    }
                }
                return firstPart;
            }
        }

        // Heuristic 2: .pi/extensions/
        if (path.includes('.pi/extensions/')) {
            const parts = path.split('.pi/extensions/');
            if (parts.length > 1) {
                return parts[1].split('/')[0];
            }
        }

        return undefined;
    }

    private formatUptime(seconds: number): string {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        let result = "";
        if (d > 0) result += `${d}d `;
        if (h > 0) result += `${h}h `;
        if (m > 0) result += `${m}m `;
        result += `${s}s`;
        return result.trim();
    }
}
