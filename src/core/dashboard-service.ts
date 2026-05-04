import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { writeFileSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

interface ExtensionMetadata {
    name: string;
    root: string;
    source: 'online' | 'local';
    version?: string;
    description?: string;
    author?: string;
    toolsCount: number;
    commandsCount: number;
    sizeMB?: number;
}

export class DashboardService {
    private readonly settingsPath = join(os.homedir(), ".pi", "agent", "settings.json");

    constructor() {
        this.ensureQuietStartup();
    }

    /**
     * Ensures that 'quietStartup' is set to true in the global settings.
     * This hides the startup header by design.
     */
    private ensureQuietStartup() {
        try {
            const data = readFileSync(this.settingsPath, "utf-8");
            const settings = JSON.parse(data);

            if (settings.quietStartup !== true) {
                settings.quietStartup = true;
                writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
            }
        } catch (e) {
            // Settings file might not exist or be malformed, we can't do much here
            // but we'll still try to clear the screen on session_start.
        }
    }

    /**
     * Clears the terminal screen.
     * Called during session_start to remove any startup logs that might have leaked.
     */
    public clearScreen(ctx?: ExtensionContext) {
        // Use console.clear for a more aggressive wipe of the terminal scrollback
        console.clear();
        // Fallback to ANSI just in case
        process.stdout.write('\x1b[2J\x1b[H');
    }

    /**
     * Prints a comprehensive welcome message with all available meta-information.
     */
    public printWelcome(api: ExtensionAPI, ctx: ExtensionContext) {
        const tools = api.getAllTools();
        const commands = api.getCommands();
        
        // 1. Calculate Extension Count
        const extensions = this.collectExtensions(api);

        // 2. Gather Session Info
        const sessionName = api.getSessionName() || "Unnamed Session";
        const sessionFile = ctx.sessionManager.getSessionFile() || "Ephemeral";
        const entryCount = ctx.sessionManager.getEntries().length;

        // 3. Gather System Info
        const platform = `${os.platform()} ${os.arch()}`;
        const nodeVer = process.version;
        const cwd = process.cwd();
        const user = os.userInfo().username;
        const uptime = this.formatUptime(os.uptime());
        
        // CPU Load (POSIX only)
        const load = (typeof os.loadavg === 'function') ? os.loadavg()[0].toFixed(2) : 'N/A';
        
        // Memory Usage
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
        const memUsage = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1);

        // 4. Gather Intelligence Info
        const thinkingLevel = api.getThinkingLevel();

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
  \x1b[32m●\x1b[0m CPU Load: ${load} | Mem: ${freeMem}/${totalMem} GB (${memUsage}%)
  \x1b[32m●\x1b[0m Path: \x1b[2m${cwd}\x1b[0m

\x1b[1m\x1b[33m🛠️ CAPABILITIES\x1b[0m
  \x1b[32m●\x1b[0m Total Tools: ${tools.length}
  \x1b[32m●\x1b[0m Total Commands: ${commands.length}
  \x1b[32m●\x1b[0m Extensions: ${extensions.size}
`;
        console.log(welcome);
    }

    /**
     * Formats uptime in a human-readable way.
     */
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

    /**
     * Formats and prints the list of active extensions.
     */
    public printExtensionList(api: ExtensionAPI) {
        const extensionsMap = this.collectExtensions(api);

        if (extensionsMap.size > 0) {
            const sortedExts = Array.from(extensionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`\x1b[1m\x1b[33mLoaded Extensions (\x1b[1m${sortedExts.length}\x1b[0m\x1b[33m):\x1b[0m`);
            
            for (const ext of sortedExts) {
                const sourceTag = ext.source === 'local' 
                    ? '\x1b[36m[Local]\x1b[0m' 
                    : '\x1b[35m[Online]\x1b[0m';
                
                const version = ext.version ? ` \x1b[2m(v${ext.version})\x1b[0m` : '';
                const size = ext.sizeMB ? ` \x1b[2m(${ext.sizeMB.toFixed(2)} MB)\x1b[0m` : '';
                const caps = ` \x1b[2m(${ext.toolsCount} tools, ${ext.commandsCount} cmds)\x1b[0m`;
                const author = ext.author ? ` \x1b[2mby ${ext.author}\x1b[0m` : '';

                console.log(`  \x1b[32m●\x1b[0m ${sourceTag} \x1b[1m${ext.name}\x1b[0m${version}${size}${caps}${author}`);
            }
            console.log(""); // Extra newline
        }
    }

    private collectExtensions(api: ExtensionAPI): Map<string, ExtensionMetadata> {
        const extensions = new Map<string, ExtensionMetadata>();

        const tools = api.getAllTools();
        for (const tool of tools) {
            if (tool.sourceInfo && tool.sourceInfo.source !== "builtin" && tool.sourceInfo.path) {
                this.updateExtensionMap(extensions, tool.sourceInfo.path, "tool");
            }
        }

        const commands = api.getCommands();
        for (const cmd of commands) {
            if (cmd.source === "extension" && cmd.sourceInfo && cmd.sourceInfo.path) {
                this.updateExtensionMap(extensions, cmd.sourceInfo.path, "command");
            }
        }

        return extensions;
    }

    private updateExtensionMap(map: Map<string, ExtensionMetadata>, path: string, type: "tool" | "command") {
        const info = this.getExtensionInfo(path);
        if (!info) return;

        let meta = map.get(info.name);
        if (!meta) {
            const pkg = this.readPackageJson(info.root);
            const sizeMB = this.getDirSize(info.root) / (1024 * 1024);
            meta = {
                name: info.name,
                root: info.root,
                source: info.source,
                ...pkg,
                sizeMB,
                toolsCount: 0,
                commandsCount: 0,
            };
            map.set(info.name, meta);
        }

        if (type === "tool") meta.toolsCount++;
        else meta.commandsCount++;
    }

    private getDirSize(dirPath: string): number {
        let totalSize = 0;
        try {
            const files = readdirSync(dirPath);
            for (const file of files) {
                const filePath = join(dirPath, file);
                const stats = statSync(filePath);
                if (stats.isDirectory()) {
                    totalSize += this.getDirSize(filePath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (e) {
            // Handle errors (e.g. permission denied)
        }
        return totalSize;
    }

    private getExtensionInfo(path: string) {
        const parts = path.split("/");
        
        const extIdx = parts.indexOf("extensions");
        if (extIdx !== -1 && parts[extIdx + 1]) {
            const name = parts[extIdx + 1];
            const root = parts.slice(0, extIdx + 2).join("/");
            return { root, name, source: 'local' as const };
        }

        const nmIdx = parts.indexOf("node_modules");
        if (nmIdx !== -1 && parts[nmIdx + 1]) {
            let name = parts[nmIdx + 1];
            let rootParts = parts.slice(0, nmIdx + 2);
            
            if (name.startsWith("@") && parts[nmIdx + 2]) {
                name = `${name}/${parts[nmIdx + 2]}`;
                rootParts.push(parts[nmIdx + 2]);
            }
            
            const root = rootParts.join("/");
            return { root, name, source: 'online' as const };
        }

        return null;
    }

    private readPackageJson(root: string) {
        try {
            const pkgPath = join(root, "package.json");
            const data = readFileSync(pkgPath, "utf-8");
            const pkg = JSON.parse(data);
            return {
                version: pkg.version,
                description: pkg.description,
                author: typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name),
            };
        } catch {
            return {};
        }
    }
}
