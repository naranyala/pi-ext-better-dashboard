# 🚀 Pi Better Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: pi-mono](https://img.shields.io/badge/Platform-pi--mono-blue.svg)]()

**Clean the slate. Know your agent.**

`pi-ext-better-dashboard` is a professional utility for the [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent) that transforms the cluttered startup experience into a streamlined, data-rich dashboard.

## 🌟 The Problem
By default, starting `pi` often results in a "wall of text"—version checks, changelogs, and dozens of `[INFO]` logs from various extensions. This clutter pushes your actual conversation history up and creates visual noise.

## ✨ The Solution
This extension intercepts the startup sequence to provide a "Zen Mode" experience:
- **Silent Startup**: Automatically suppresses the official host header and silences all extension initialization logs.
- **Aggressive Clear**: Wipes the terminal scrollback immediately upon session start.
- **Welcome Dashboard**: Replaces the noise with a professional summary of your agent's current state.
- **Intelligent Log Tagging**: Monkey-patches the global console to replace generic `[INFO]` tags with the actual name of the extension emitting the log.

---

## 🖼️ Preview

When you start your session, instead of a wall of logs, you see this:

```text
Welcome to pi coding agent
The ultimate AI coding companion

🤖 MODEL INFO
  ● Thinking Level: high

📂 SESSION
  ● Name: Refactoring Auth Module
  ● File: /home/user/.pi/sessions/auth-refactor.json
  ● History: 42 entries

⚙️ SYSTEM
  ● OS: linux x64 | Node: v20.11.0
  ● Path: /home/user/projects/my-app

🛠️ CAPABILITIES
  ● Total Tools: 156
  ● Total Commands: 24
  ● Extensions: 12

Loaded Extensions:
  ● pi-ext-better-dashboard
  ● pi-ext-rust-companion
  ● pi-ext-typescript-companion
  ...
```

---

## 🚀 Installation

### 📂 Option 1: Global Installation (Recommended)
To apply this to all your projects, place the extension in your global extensions folder:
1. Clone or download this repository.
2. Move the folder/file to: `~/.pi/agent/extensions/pi-ext-better-dashboard`

### 📁 Option 2: Project-Local Installation
To use this only for a specific project:
1. Create a `.pi/extensions/` directory in your project root.
2. Move the extension into that folder.

### 🔄 Reloading
If `pi` is already running, simply type `/reload` to apply the changes.

---

## 🛠️ Technical Deep Dive (For Developers)

For those curious about how this works under the hood, the extension employs several advanced TypeScript patterns:

### 1. Console Monkey-Patching
The `LogInterceptor` wraps the global `console` object. It implements a `silenceMode` that drops logs during the critical startup window and a regex-based processor that dynamically replaces `[INFO]` with extracted extension names.

### 2. Heuristic Path Parsing
To identify extension names accurately, the service analyzes tool and command source paths using a multi-stage heuristic that accounts for `node_modules`, `src/dist` build folders, and standalone script files.

### 3. Host Configuration Injection
The extension programmatically ensures that `quietStartup: true` is set in your `~/.pi/agent/settings.json`, leveraging the host's native ability to suppress the initial banner.

---

## 🤝 Contributing
Contributions are welcome! Whether it's adding new meta-information to the dashboard or improving the path-parsing heuristics, feel free to open an issue or a pull request.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
