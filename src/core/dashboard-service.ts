import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { writeFileSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import os from "node:os";

interface ExtensionMetadata {
    name: string;
    root: string;
    version?: string;
    description?: string;
    author?: string;
    toolsCount: number;
    commandsCount: number;
    sizeMB?: number;
    installed: boolean;
    loaded: boolean;
}

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
        console.clear();
        process.stdout.write('\x1b[2J\x1b[H');
    }

    public printWelcome(api: ExtensionAPI, ctx: ExtensionContext) {
        const extensions = this.collectAllExtensions(api);
        
        const sessionName = api.getSessionName() || "Unnamed Session";
        const sessionFile = ctx.sessionManager.getSessionFile() || "Ephemeral";
        const entryCount = ctx.sessionManager.getEntries().length;

        const platform = `${os.platform()} ${os.arch()}`;
        const nodeVer = process.version;
        const cwd = process.cwd();
        const user = os.userInfo().username;
        const uptime = this.formatUptime(os.uptime());
        
        const load = (typeof os.loadavg === 'function') ? os.loadavg()[0].toFixed(2) : 'N/A';
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
        const memUsage = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1);
        const thinkingLevel = api.getThinkingLevel();

        // Build extension list
        let extensionList = "";
        const sortedExts = Array.from(extensions.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        for (const ext of sortedExts) {
            const status = ext.loaded ? "\x1b[32m●\x1b[0m" : "\x1b[30m○\x1b[0m";
            const version = ext.version ? ` \x1b[2m(v${ext.version})\x1b[0m` : '';
            const size = ext.sizeMB ? ` \x1b[2m(${ext.sizeMB.toFixed(2)} MB)\x1b[0m` : '';
            const caps = ` \x1b[2m(${ext.toolsCount} tools, ${ext.commandsCount} cmds)\x1b[0m`;
            const author = ext.author ? ` \x1b[2mby ${ext.author}\x1b[0m` : '';

            extensionList += `  ${status} \x1b[1m${ext.name}\x1b[0m${version}${size}${caps}${author}\n`;
        }

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

\x1b[1m\x1b[33m🧩 EXTENSIONS\x1b[0m
  \x1b[2m(● loaded, ○ installed)\x1b[0m
${extensionList}
`;
        console.log(welcome);
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

    private collectAllExtensions(api: ExtensionAPI): Map<string, ExtensionMetadata> {
        const extensions = new Map<string, ExtensionMetadata>();

        // 1. Scan installation directories for all installed extensions
        const installRoots = [
            join(os.homedir(), ".pi", "agent", "extensions"),
            join(os.homedir(), ".pi", "agent", "node_modules"),
            join(os.homedir(), ".pi", "agent", "git"),
            process.env.npm_config_prefix || join(os.homedir(), ".npm-packages", "lib", "node_modules")
        ];

        for (const root of installRoots) {
            if (existsSync(root)) {
                this.recursiveScan(root, extensions);
            }
        }

        // 2. Mark loaded ones and get accurate counts via API
        const tools = api.getAllTools();
        for (const tool of tools) {
            if (tool.sourceInfo && (tool.sourceInfo.source as string) !== "builtin" && tool.sourceInfo.path) {
                this.updateExtensionMap(extensions, tool.sourceInfo.path, "tool", true);
            }
        }

        const commands = api.getCommands();
        for (const cmd of commands) {
            if ((cmd.source as string) !== "builtin" && cmd.sourceInfo && cmd.sourceInfo.path) {
                this.updateExtensionMap(extensions, cmd.sourceInfo.path, "command", true);
            }
        }

        return extensions;
    }

    private recursiveScan(dir: string, extensions: Map<string, ExtensionMetadata>) {
        try {
            const files = readdirSync(dir);
            for (const file of files) {
                const fullPath = join(dir, file);
                const stats = statSync(fullPath);
                if (stats.isDirectory()) {
                    // Check if this directory contains a package.json
                    const pkgPath = join(fullPath, "package.json");
                    if (existsSync(pkgPath)) {
                        const info = this.getExtensionInfo(fullPath);
                        if (info) {
                            const pkg = this.readPackageJson(info.root);
                            const sizeMB = this.getDirSize(info.root) / (1024 * 1024);
                            extensions.set(info.name, {
                                name: info.name,
                                root: info.root,
                                version: pkg.version,
                                description: pkg.description,
                                author: pkg.author,
                                sizeMB,
                                toolsCount: 0,
                                commandsCount: 0,
                                installed: true,
                                loaded: false
                            });
                        }
                    }
                    // Recurse into subdirectories (e.g. for the git/github.com/user/repo structure)
                    this.recursiveScan(fullPath, extensions);
                }
            }
        } catch (e) {}
    }

    private updateExtensionMap(map: Map<string, ExtensionMetadata>, path: string, type: "tool" | "command", isLoaded: boolean) {
        const info = this.getExtensionInfo(path);
        if (!info) return;

        let meta = map.get(info.name);
        if (!meta) {
            const pkg = this.readPackageJson(info.root);
            const sizeMB = this.getDirSize(info.root) / (1024 * 1024);
            meta = {
                name: info.name,
                root: info.root,
                version: pkg.version,
                description: pkg.description,
                author: pkg.author,
                sizeMB,
                toolsCount: 0,
                commandsCount: 0,
                installed: true,
                loaded: isLoaded
            };
            map.set(info.name, meta);
        }

        meta.loaded = meta.loaded || isLoaded;
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
                if (stats.isDirectory()) totalSize += this.getDirSize(filePath);
                else totalSize += stats.size;
            }
        } catch (e) {}
        return totalSize;
    }

    private getExtensionInfo(path: string) {
        let currentDir = path;
        const parts = path.split("/");
        const fileName = parts[parts.length - 1];
        const isFile = fileName.includes('.');

        if (isFile) currentDir = dirname(path);

        // First, try to find package.json
        let searchDir = currentDir;
        while (true) {
            const pkgPath = join(searchDir, "package.json");
            if (existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
                    return { root: searchDir, name: pkg.name || searchDir.split('/').pop() || '' };
                } catch {
                    return { root: searchDir, name: searchDir.split('/').pop() || '' };
                }
            }
            if (searchDir === "/" || searchDir === ".") break;
            const parentDir = dirname(searchDir);
            if (parentDir === searchDir) break;
            searchDir = parentDir;
        }

        // Fallback: use path heuristics ONLY for known extension directories
        const pathParts = currentDir.split("/");
        const piAgentIndex = pathParts.indexOf("agent");
        if (piAgentIndex !== -1) {
            const afterAgent = pathParts.slice(piAgentIndex + 1);
            const extIndex = afterAgent.indexOf("extensions");
            if (extIndex !== -1 && afterAgent[extIndex + 1]) {
                return { root: join(...pathParts.slice(0, piAgentIndex + 1 + extIndex + 2)), name: afterAgent[extIndex + 1] };
            }

            const nodeModIndex = afterAgent.indexOf("node_modules");
            if (nodeModIndex !== -1 && afterAgent[nodeModIndex + 1]) {
                return { root: join(...pathParts.slice(0, piAgentIndex + 1 + nodeModIndex + 2)), name: afterAgent[nodeModIndex + 1] };
            }

            const gitIndex = afterAgent.indexOf("git");
            if (gitIndex !== -1 && afterAgent[gitIndex + 1]) {
                return { root: join(...pathParts.slice(0, piAgentIndex + 1 + gitIndex + 2)), name: afterAgent[gitIndex + 1] };
            }
        }

        // For standalone files directly in extensions folder (no subdirectory)
        if (isFile && pathParts[pathParts.length - 1] === "extensions" && pathParts[pathParts.length - 2] === "agent") {
            return { root: currentDir, name: fileName.replace(/\.[^.]+$/, '') };
        }

        return null;
    }

    private readPackageJson(root: string) {
        try {
            const pkgPath = join(root, "package.json");
            const data = readFileSync(pkgPath, "utf-8");
            const pkg = JSON.parse(data);
            return {
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
                author: typeof pkg.author === 'string' ? pkg.author : (pkg.author?.name),
            };
        } catch {
            return {};
        }
    }
}
