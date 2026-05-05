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
            const message = chunk?.toString() || "";
            if (LogInterceptor.silenceMode && (
                message.includes("Loaded Extensions") || 
                message.includes("[Online]")
            )) {
                return;
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
