/**
 * LogInterceptor monkey-patches the global console to clean up and 
 * beautify logs from the host and other extensions.
 */
export class LogInterceptor {
    static originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
    };

    static silenceMode = true;

    static patch() {
        if ((console as any).__pi_patched) return;

        const methods: (keyof typeof this.originalConsole)[] = ['log', 'info', 'warn', 'error'];

        methods.forEach(method => {
            (console as any)[method] = (...args: any[]) => {
                if (this.silenceMode) {
                    if (method !== 'error') return;
                }

                const processedArgs = args.map(arg => {
                    if (typeof arg !== 'string') return arg;
                    return this.processMessage(arg);
                });
                this.originalConsole[method](...processedArgs);
            };
        });

        // Patch process.stdout.write to catch low-level host logs
        const originalWrite = process.stdout.write;
        process.stdout.write = function(...args: unknown[]) {
            const chunk = args[0];
            let message = chunk?.toString() || "";
            if (LogInterceptor.silenceMode && (
                message.includes("Loaded Extensions") || 
                message.includes("[Online]")
            )) {
                return;
            }

            if (message.includes("Loaded Extensions")) {
                const parts = message.split(/Loaded Extensions:?\s*/i);
                if (parts.length > 1) {
                    let listContent = parts[1];
                    
                    // 1. Remove legend like "(● loaded, ○ installed)"
                    listContent = listContent.replace(/\([^)]*[\u25cf\u25cb\u25a0\u25a1][^)]*\)/, '');

                    // 2. Split by common delimiters including all status symbols
                    const rawNames = listContent.split(/[\n,•●○\-\*\(\)\[\]\u25cf\u25cb]/);
                    const cleanedNames = rawNames
                        .map(n => n.trim())
                        .filter(n => n.length > 0)
                        .map(n => n.split(/[./]/)[0])
                        .filter(n => n.length > 0 && 
                                     !['loaded', 'installed', '(', ')', '○', '●', 'ext', 'extensions'].includes(n.toLowerCase()) &&
                                     !/^\d+(\.\d+)?\s*(B|KB|MB|GB|TB)$/i.test(n));
                    
                    const uniqueNames = Array.from(new Set(cleanedNames));
                    if (uniqueNames.length > 0) {
                        message = `Loaded Extensions: ${uniqueNames.join(', ')}`;
                    }
                }
            }

            if (message !== chunk?.toString()) {
                return originalWrite.apply(process.stdout, [message, ...args.slice(1)]);
            }
            return originalWrite.apply(process.stdout, args);
        };

        (console as any).__pi_patched = true;
    }

    static setSilence(enabled: boolean) {
        this.silenceMode = enabled;
    }

    private static processMessage(msg: string): string {
        // 1. Handle [INFO] replacement
        if (msg.startsWith('[INFO]')) {
            const infoRegex = /^\[INFO\]\s+([^.]+?)\s+(?:Extension\s+)?(?:initialized|loaded|registered|started|ready|ready\s+now).*$/i;
            const nameMatch = msg.match(infoRegex);
            
            if (nameMatch && nameMatch[1]) {
                const extensionName = nameMatch[1].trim();
                return msg.replace('[INFO]', `\x1b[1m\x1b[36m[${extensionName}]\x1b[0m`);
            }
            
            return msg.replace('[INFO]', `\x1b[1m\x1b[36m[Extension]\x1b[0m`);
        }

        // 2. Handle [SYSTEM] or other existing tags
        const tagMatch = msg.match(/^\[([^\]]+)\]/);
        if (tagMatch) {
            const tag = tagMatch[1];
            const color = tag.toUpperCase() === 'SYSTEM' ? '\x1b[31m' : '\x1b[33m';
            return msg.replace(`[${tag}]`, `${color}\x1b[1m[${tag}]\x1b[0m`);
        }

        // 3. Handle messages with no tag
        const initRegex = /([^.]+?)\s+(?:Extension\s+)?(?:initialized|registered).*$/i;
        const nameMatch = msg.match(initRegex);
        if (nameMatch && nameMatch[1]) {
            const extensionName = nameMatch[1].trim();
            return `\x1b[1m\x1b[36m[${extensionName}]\x1b[0m ${msg}`;
        }

        return msg;
    }
}
