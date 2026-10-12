// Claude Assistant - web administrator UI (equivalent of the Swing ClaudeClientPlugin and
// ClaudeSettingsPlugin). Talks to the same REST API (/api/extensions/claude/...), so masking,
// permissions, action approval and the audit log behave exactly as in the Swing client.
// Plain ES module against platform.React: no build step.

const EXT = "/extensions/claude";
const STYLE_ID = "claude-assistant-style";
// The web admin has no plugin hook on the Global Scripts view, so the Claude page offers this context itself.
const GLOBAL_SCRIPTS_CONTEXT = "全局脚本（部署、卸载、前置处理器和后置处理器）。Claude 看到的是已保存的版本；全局脚本编辑器中未保存的更改不可见。";
const GLOBAL_SCRIPTS_SUGGESTION = "解释全局脚本的功能并指出薄弱环节。";
const POLL_MS = 800;
const BILLING_URL = "https://platform.claude.com/settings/billing";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
// Stored value (English name, used in the system prompt) and the label shown in the dropdown.
const LANGUAGES = [
    ["Automatic", "自动（问题的语言）"], ["English", "English"], ["Dutch", "Nederlands (Dutch)"], ["German", "Deutsch (German)"],
    ["French", "Français (French)"], ["Spanish", "Español (Spanish)"], ["Italian", "Italiano (Italian)"], ["Portuguese", "Português (Portuguese)"],
    ["Polish", "Polski (Polish)"], ["Swedish", "Svenska (Swedish)"], ["Danish", "Dansk (Danish)"], ["Norwegian", "Norsk (Norwegian)"], ["Finnish", "Suomi (Finnish)"]
];
// Stored value of "Review before sending" and its label.
const REVIEWS = [["data", "消息内容、日志和事件（推荐）"], ["all", "所有内容，包括我的问题"], ["off", "关闭（无审查直接发送）"]];
// Stroke-only 24x24 path, same format as the built-in icons: an eight-point burst.
const ICON_PATH = "M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M5.6 18.4l3.5-3.5M14.9 9.1l3.5-3.5";

const CSS = `
.claude-page { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 12px 16px; box-sizing: border-box; gap: 8px; }
.claude-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 8px; }
.claude-embedded { height: 100%; min-height: 420px; padding: 8px 0; box-sizing: border-box; }
.claude-contextbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--text-dim); font-size: 12px; }
.claude-contextbar .claude-context { flex: 1 1 240px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.claude-contextbar .btn { flex: none; white-space: nowrap; }
.claude-transcript { flex: 1; min-height: 160px; overflow: auto; background: var(--bg1); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; }
.claude-transcript > div { margin: 6px 0; }
.claude-user { background: var(--bg3); border-radius: var(--radius); padding: 6px 10px; white-space: pre-wrap; margin-top: 14px !important; }
.claude-text { color: var(--text); line-height: 1.5; }
.claude-text p { margin: 6px 0; }
.claude-text h2, .claude-text h3, .claude-text h4, .claude-text h5 { margin: 12px 0 6px; }
.claude-text pre { font-family: var(--font-mono); font-size: 12px; background: var(--bg2); border: 1px solid var(--line); border-radius: var(--radius); padding: 8px; overflow: auto; }
.claude-text code { font-family: var(--font-mono); font-size: 12px; background: var(--bg2); padding: 0 3px; border-radius: 2px; }
.claude-text pre code { background: none; padding: 0; }
.claude-text table { border-collapse: collapse; margin: 6px 0; }
.claude-text th, .claude-text td { border: 1px solid var(--line-strong); padding: 3px 8px; text-align: left; vertical-align: top; }
.claude-text th { background: var(--bg2); }
.claude-text ul, .claude-text ol { margin: 4px 0; padding-left: 22px; }
.claude-tool { color: var(--text-faint); font-size: 12px; font-family: var(--font-mono); }
.claude-action { color: var(--ok); }
.claude-error { color: var(--err); }
.claude-info { color: var(--warn); }
.claude-input { display: flex; gap: 8px; align-items: stretch; }
.claude-input textarea { flex: 1; min-height: 64px; resize: vertical; font: inherit; color: var(--text); background: var(--bg1); border: 1px solid var(--line-strong); border-radius: var(--radius); padding: 6px 8px; }
.claude-input .claude-buttons { display: flex; flex-direction: column; gap: 6px; }
.claude-status { color: var(--text-faint); font-size: 12px; min-height: 16px; }
.claude-detail { font-family: var(--font-mono); font-size: 12px; white-space: pre-wrap; max-height: 55vh; overflow: auto; background: var(--bg1); border: 1px solid var(--line); border-radius: var(--radius); padding: 8px; margin: 8px 0 0; }
.claude-review { display: block; width: 100%; box-sizing: border-box; height: 50vh; margin: 8px 0 4px; resize: vertical; font-family: var(--font-mono); font-size: 12px; color: var(--text); background: var(--bg1); border: 1px solid var(--line-strong); border-radius: var(--radius); padding: 8px; }
.claude-hint { color: var(--text-faint); font-size: 12px; }
.claude-settings { padding: 12px 16px; max-width: 760px; }
.claude-settings .claude-row { display: grid; grid-template-columns: 220px 1fr; gap: 10px; align-items: start; margin: 8px 0; }
.claude-settings .claude-row > label { text-align: right; color: var(--text-dim); padding-top: 7px; line-height: 18px; }
.claude-settings .claude-row > div > .claude-hint { margin-top: 4px; }
.claude-settings .claude-text-value { padding-top: 7px; line-height: 18px; }
.claude-settings input[type=password], .claude-settings input[type=text], .claude-settings input[type=number], .claude-settings select, .claude-settings textarea {
  font: inherit; color: var(--text); background: var(--bg1); border: 1px solid var(--line-strong); border-radius: var(--radius); padding: 4px 6px; box-sizing: border-box; }
.claude-settings input[type=password], .claude-settings input[type=text], .claude-settings textarea { width: 100%; }
.claude-settings .claude-hint { color: var(--text-faint); font-size: 12px; }
.claude-settings h3 { margin: 18px 0 4px; padding-top: 12px; border-top: 1px solid var(--line); }
.claude-settings .claude-spend { font-weight: 600; }
.claude-conversations { width: 100%; font-family: inherit; margin-bottom: 8px; }
.claude-settings .claude-inline { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.claude-settings .claude-warning { color: #b35900; }
`;

let P;
let React;
let e;

// ------------------------------------------------------------------ REST API
// raw:true everywhere: the shell's parseBody unwraps single-key JSON objects.

async function call(method, path, body, params) {
    const api = P.api;
    let text;
    if (method === "GET") {
        text = await api.get(EXT + path, params, { raw: true });
    } else if (method === "POST") {
        text = await api.post(EXT + path, body == null ? "" : JSON.stringify(body), { params, contentType: "text/plain", raw: true });
    } else {
        text = await api.put(EXT + path, JSON.stringify(body), { params, contentType: "text/plain", raw: true });
    }
    return text ? JSON.parse(text) : {};
}

function errorText(err) {
    if (!err) return "未知错误";
    const text = err.body || err.message || String(err);
    // The server answers with a readable sentence as the response body.
    return String(text).trim().split(/\r?\n/).pop();
}

// ------------------------------------------------------------------ Markdown -> HTML
// Same subset as the Swing client (headings, paragraphs, lists, tables, code, bold, italic);
// everything is escaped first, so the result is safe to insert as HTML.

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g;

function inline(text) {
    let out = "";
    let last = 0;
    for (const m of text.matchAll(INLINE)) {
        out += esc(text.slice(last, m.index));
        if (m[1] != null) out += "<code>" + esc(m[1]) + "</code>";
        else if (m[2] != null || m[3] != null) out += "<b>" + inline(m[2] != null ? m[2] : m[3]) + "</b>";
        else out += "<i>" + inline(m[4] != null ? m[4] : m[5]) + "</i>";
        last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
}

function cells(row) {
    let r = row.trim();
    if (r.startsWith("|")) r = r.slice(1);
    if (r.endsWith("|")) r = r.slice(0, -1);
    return r.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function markdown(md) {
    const lines = String(md).replace(/\r\n?/g, "\n").split("\n");
    const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
    const UNORDERED = /^\s*[-*+]\s+(.*)$/;
    const SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
    let out = "";
    let para = [];
    const flush = () => {
        if (para.length) out += "<p>" + para.map(inline).join("<br>") + "</p>";
        para = [];
    };
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const t = line.trim();
        if (t.startsWith("```")) {
            flush();
            const code = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
            i++;
            out += "<pre><code>" + esc(code.join("\n")) + "</code></pre>";
            continue;
        }
        if (!t) { flush(); i++; continue; }
        const heading = t.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flush();
            const level = Math.min(heading[1].length + 1, 5);
            out += `<h${level}>${inline(heading[2])}</h${level}>`;
            i++;
            continue;
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); out += "<hr>"; i++; continue; }
        if (t.startsWith("|") && i + 1 < lines.length && SEPARATOR.test(lines[i + 1])) {
            flush();
            out += "<table><tr>" + cells(t).map((c) => "<th>" + inline(c) + "</th>").join("") + "</tr>";
            i += 2;
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                out += "<tr>" + cells(lines[i]).map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>";
                i++;
            }
            out += "</table>";
            continue;
        }
        if (UNORDERED.test(line) || ORDERED.test(line)) {
            flush();
            const ordered = ORDERED.test(line);
            const item = ordered ? ORDERED : UNORDERED;
            out += ordered ? "<ol>" : "<ul>";
            while (i < lines.length && item.test(lines[i])) {
                out += "<li>" + inline(lines[i].match(item)[1]);
                i++;
                // Continuation lines and nested items stay inside the same item.
                while (i < lines.length && lines[i].trim() && /^\s/.test(lines[i])) out += "<br>" + inline(lines[i++].trim());
                out += "</li>";
            }
            out += ordered ? "</ol>" : "</ul>";
            continue;
        }
        para.push(t);
        i++;
    }
    flush();
    return out;
}

// ------------------------------------------------------------------ chat controller
// One conversation per browser tab, kept outside React so it survives navigating between
// the Claude page, the channel tab and other views while Claude is still working.

const chat = {
    conversationId: null,
    context: null,
    suggestion: null,
    entries: [],
    // Claude's answer while it is being written; replaced by the complete "text" event.
    partial: "",
    jobId: null,
    lastSeq: 0,
    busy: false,
    status: "",
    shownActionId: null,
    timer: null,
    polling: false,
    listeners: new Set(),

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    },
    notify() {
        for (const fn of this.listeners) fn();
    },
    add(kind, text) {
        this.entries = [...this.entries, { kind, text }];
        this.notify();
    },
    setStatus(text) {
        this.status = text;
        this.notify();
    },

    /** Sets the context (and a suggested question) from an action in the Administrator. */
    open(context, suggestion) {
        this.context = context;
        if (suggestion) this.suggestion = suggestion;
        this.notify();
    },
    clearContext() {
        this.context = null;
        this.notify();
    },

    async send(text) {
        if (!text.trim() || this.busy) return;
        this.add("user", text);
        this.busy = true;
        this.setStatus("发送中…");
        try {
            const res = await call("POST", "/chat", { conversationId: this.conversationId, message: text, context: this.context });
            this.conversationId = res.conversationId;
            this.jobId = res.jobId;
            this.lastSeq = 0;
            this.shownActionId = null;
            this.setStatus("Claude 思考中…");
            this.timer = setInterval(() => this.poll(), POLL_MS);
        } catch (err) {
            this.busy = false;
            this.status = "";
            this.add("error", errorText(err));
        }
    },

    async poll() {
        if (this.polling || !this.jobId) return;
        this.polling = true;
        const id = this.jobId;
        try {
            const job = await call("GET", "/jobs/" + encodeURIComponent(id), null, { after: this.lastSeq });
            if (id === this.jobId) this.handle(job);
        } catch (err) {
            this.finishJob();
            this.add("error", "与服务器的连接丢失：" + errorText(err));
        } finally {
            this.polling = false;
        }
    },

    handle(job) {
        for (const ev of job.events || []) {
            this.lastSeq = Math.max(this.lastSeq, ev.seq || 0);
            if (ev.type === "tool") this.status = "Claude 正在查询服务器…";
            this.entries = [...this.entries, { kind: ev.type, text: ev.text }];
        }
        this.partial = job.partial || "";
        if (this.partial) this.status = "Claude 正在写入…";
        const pending = job.pendingAction;
        if (job.state === "WAITING" && pending && pending.id !== this.shownActionId) {
            this.shownActionId = pending.id;
            this.status = "等待您的批准…";
            this.askApproval(pending);
        }
        const review = job.pendingReview;
        if (job.state === "WAITING" && review && review.id !== this.shownActionId) {
            this.shownActionId = review.id;
            this.status = "等待您的审查…";
            this.askReview(review);
        }
        if (job.state === "DONE" || job.state === "ERROR" || job.state === "CANCELLED") {
            this.finishJob();
        }
        this.notify();
    },

    finishJob() {
        clearInterval(this.timer);
        this.timer = null;
        this.jobId = null;
        this.partial = "";
        this.busy = false;
        this.status = "";
        this.notify();
    },

    stop() {
        const id = this.jobId;
        if (!id) return;
        this.finishJob();
        this.add("info", "已停止。");
        call("POST", "/jobs/" + encodeURIComponent(id) + "/cancel").catch(() => {});
    },

    newConversation() {
        if (this.jobId) this.stop();
        this.conversationId = null;
        this.entries = [];
        this.partial = "";
        this.notify();
    },

    /** Downloads the conversation as Markdown, as the server has it: what Claude received (masked) and answered. */
    async exportConversation() {
        if (!this.conversationId) {
            this.add("info", "还没有可以导出的对话。");
            return;
        }
        try {
            const res = await call("GET", "/conversations/" + encodeURIComponent(this.conversationId) + "/export");
            const blob = new Blob([res.markdown || ""], { type: "text/markdown;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = res.fileName || "claude-conversation.md";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            this.add("error", "导出失败：" + errorText(err));
        }
    },

    /** Lists the user's conversations (current and saved) and continues the chosen one. */
    async chooseConversation() {
        if (this.jobId) {
            this.add("info", "请等待 Claude 完成，或点击停止。");
            return;
        }
        let res;
        try {
            res = await call("GET", "/conversations");
        } catch (err) {
            this.add("error", errorText(err));
            return;
        }
        const list = res.conversations || [];
        const note = res.keepDays > 0
            ? "对话在服务器上保存 " + res.keepDays +  "天。"
            : "对话不在服务器上保存：保留 4 小时，重启后丢失（设置 > Claude 助手）。";
        const { h, modal } = P.ui;
        if (list.length === 0) {
            modal({ title: "对话", body: h("div", null, "您没有早期的对话。" + note), buttons: [{ label: "关闭", primary: true, onClick: () => true }] });
            return;
        }
        // A plain DOM select, so its value can be read back whatever the shell's h() returns.
        const select = document.createElement("select");
        select.className = "claude-conversations";
        select.size = Math.min(12, Math.max(4, list.length));
        for (const c of list) {
            const option = document.createElement("option");
            option.value = c.id;
            option.textContent = new Date(c.lastUsed).toLocaleString() + "   " + c.title + (c.id === this.conversationId ? "   (当前)" : "");
            select.appendChild(option);
        }
        select.selectedIndex = 0;
        const resume = async () => {
            const id = select.value;
            if (!id) return true;
            try {
                this.showConversation(await call("POST", "/conversations/" + encodeURIComponent(id) + "/resume"));
            } catch (err) {
                this.add("error", errorText(err));
            }
            return true;
        };
        select.ondblclick = () => { resume(); };
        modal({
            title: "对话",
            size: "lg",
            body: h("div", null, select, h("div.claude-hint", null, note)),
            buttons: [
                { label: "取消", onClick: () => true },
                { label: "继续", primary: true, onClick: resume }
            ]
        });
    },

    showConversation(resumed) {
        this.conversationId = resumed.conversationId;
        this.entries = (resumed.log || []).map((entry) => ({ kind: entry.type === "question" ? "user" : entry.type, text: entry.text }));
        this.entries.push({ kind: "info", text: "已继续对话。请提出您的下一个问题。" });
        this.notify();
    },

    askApproval(pending) {
        const jobId = this.jobId;
        const { h, modal } = P.ui;
        let decided = false;
        const decide = async (approved) => {
            if (decided) return true;
            decided = true;
            this.setStatus(approved ? "执行操作中…" : "Claude 继续中…");
            try {
                await call("POST", "/jobs/" + encodeURIComponent(jobId) + "/confirm", { actionId: pending.id, approved });
                this.setStatus("Claude 继续中…");
            } catch (err) {
                this.add("error", "批准失败：" + errorText(err));
            }
            return true;
        };
        modal({
            title: "批准：" + pending.title,
            size: "lg",
            body: h("div", null,
                h("div", null, "Claude 希望在此服务器上执行以下操作："),
                h("pre.claude-detail", null, pending.detail || "")),
            buttons: [
                { label: "拒绝", onClick: () => decide(false) },
                { label: "执行", danger: true, onClick: () => decide(true) }
            ],
            // Closing the dialog (X, Escape, clicking outside) counts as rejecting, as in Swing.
            onClose: () => { decide(false); }
        });
    },

    /** Shows exactly what Claude would receive; the user can edit it, send it or withhold it. */
    askReview(review) {
        const jobId = this.jobId;
        const { h, modal } = P.ui;
        // A plain DOM textarea, so its value can be read back whatever the shell's h() returns.
        const text = document.createElement("textarea");
        text.className = "claude-review";
        text.value = review.detail || "";
        text.spellcheck = false;
        let decided = false;
        const decide = async (approved) => {
            if (decided) return true;
            decided = true;
            this.setStatus("Claude 继续中…");
            try {
                await call("POST", "/jobs/" + encodeURIComponent(jobId) + "/review", approved ? { reviewId: review.id, approved, text: text.value } : { reviewId: review.id, approved });
            } catch (err) {
                this.add("error", "审查失败：" + errorText(err));
            }
            return true;
        };
        modal({
            title: "发送前审查：" + review.title,
            size: "lg",
            body: h("div", null,
                h("div", null, "这是脱敏后将发送给 Claude (Anthropic) 的完整内容。编辑以移除 Claude 不应看到的内容；编辑后的文本在发送前会再次脱敏。"),
                text,
                h("div.claude-hint", null, (review.detail || "").length + " 个字符。关闭此对话框将不发送任何内容。")),
            buttons: [
                { label: "不发送", onClick: () => decide(false) },
                { label: "发送给 Claude", primary: true, onClick: () => decide(true) }
            ],
            // Closing the dialog (X, Escape, clicking outside) sends nothing.
            onClose: () => { decide(false); }
        });
    }
};

// ------------------------------------------------------------------ React components

function useChat() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => chat.subscribe(() => setTick((n) => n + 1)), []);
    return chat;
}

function Entry({ entry }) {
    switch (entry.kind) {
        case "user":
            return e("div", { className: "claude-user" }, e("b", null, "您："), entry.text);
        case "text":
            return e("div", { className: "claude-text", dangerouslySetInnerHTML: { __html: markdown(entry.text) } });
        case "tool":
            return e("div", { className: "claude-tool" }, "→ " + entry.text);
        case "action":
            return e("div", { className: "claude-action" }, e("b", null, "已完成："), entry.text);
        case "error":
            return e("div", { className: "claude-error" }, entry.text);
        default:
            return e("div", { className: "claude-info" }, entry.text);
    }
}

function ChatPanel() {
    const c = useChat();
    const [输入，setInput] = React.useState("");
    const transcriptRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const lastSuggestion = React.useRef(null);

    // A suggestion from an action fills the 输入，unless the user already typed something of
    // their own (an untouched earlier suggestion is replaced).
    React.useEffect(() => {
        if (c.suggestion) {
            if (!input.trim() || input === lastSuggestion.current) {
                setInput(c.suggestion);
                lastSuggestion.current = c.suggestion;
                setTimeout(() => inputRef.current && inputRef.current.select(), 0);
            }
            c.suggestion = null;
        }
    });

    React.useEffect(() => {
        const el = transcriptRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [c.entries.length, c.partial.length]);

    const send = () => {
        const text = input.trim();
        if (!text || c.busy) return;
        setInput("");
        c.send(text);
    };

    const welcome = c.entries.length === 0
        ? e("div", { className: "claude-info" },
            "向您的 OIE 服务器提问，例如 ", e("i", null, "哪些通道有错误？"), " 或 ", e("i", null, "为什么这条消息失败？"),
            e("br"), "消息内容在发送给 Claude 前会被脱敏。部署等操作仅在您批准后才会执行。")
        : null;

    return e("div", { className: "claude-panel" },
        e("div", { className: "claude-contextbar" },
            e("span", { className: "claude-context", title: c.context || "" },
                c.context ? [e("b", { key: "l" }, "上下文："), c.context] : "无上下文：Claude 查看整个服务器。"),
            e("button", {
                className: "btn",
                title: "询问全局部署、卸载、前置处理器和后置处理器脚本",
                disabled: c.context === GLOBAL_SCRIPTS_CONTEXT,
                onClick: () => c.open(GLOBAL_SCRIPTS_CONTEXT, GLOBAL_SCRIPTS_SUGGESTION)
            }, "全局脚本"),
            e("button", { className: "btn", disabled: !c.context, onClick: () => c.clearContext() }, "清除上下文"),
            e("button", { className: "btn", title: "继续之前的对话", onClick: () => c.chooseConversation() }, "对话…"),
            e("button", { className: "btn", title: "将此对话保存为 Markdown 文件", disabled: !c.conversationId, onClick: () => c.exportConversation() }, "导出"),
            e("button", { className: "btn", onClick: () => c.newConversation() }, "新对话")),
        e("div", { className: "claude-transcript", ref: transcriptRef },
            welcome,
            c.entries.map((entry, i) => e(Entry, { key: i, entry })),
            c.partial ? e(Entry, { key: "partial", entry: { kind: "text", text: c.partial } }) : null),
        e("div", { className: "claude-input" },
            e("textarea", {
                ref: inputRef,
                value: input,
                placeholder: "向 Claude 提问…（Ctrl+Enter 发送）",
                onChange: (ev) => setInput(ev.target.value),
                onKeyDown: (ev) => {
                    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
                        ev.preventDefault();
                        send();
                    }
                }
            }),
            e("div", { className: "claude-buttons" },
                e("button", { className: "btn btn-primary", disabled: c.busy || !input.trim(), onClick: send }, "发送"),
                e("button", { className: "btn", disabled: !c.busy, onClick: () => c.stop() }, "停止"))),
        e("div", { className: "claude-status" }, c.status || " "));
}

function ChatView() {
    return e("div", { className: "claude-page" }, e(ChatPanel));
}

/** "Claude" tab in the channel editor: the chat, with this channel as context. */
function ChannelTab(props) {
    const channel = props.channel || (props.ctx && props.ctx.channel) || {};
    React.useEffect(() => {
        if (!channel.id) return;
        const context = `在编辑器中打开的通道：'${channel.name}' (${channel.id}, revision ${channel.revision}). Claude 看到的是已保存的版本；编辑器中未保存的更改不可见。`;
        if (chat.context !== context) chat.open(context, "解释此通道的功能并指出其脚本中的薄弱环节。");
    }, [channel.id]);
    return e("div", { className: "claude-panel claude-embedded" }, e(ChatPanel));
}

/**
 * Settings > Claude Assistant. Hooks into the settings shell like the built-in tabs: setSave for
 * the shell's Save (and its unsaved-changes prompt), markDirty/markClean, and a task pane.
 */
function SettingsPanel({ setTasks, setSave, markDirty, markClean }) {
    const [form, setForm] = React.useState(null);
    const [status, setStatus] = React.useState({});
    const [spend, setSpend] = React.useState({ state: "idle" });
    // The model list comes from the server: Anthropic's, or a fixed list when it cannot be read.
    const [models, setModels] = React.useState({ state: "idle" });
    const [error, setError] = React.useState(null);
    const formRef = React.useRef(null);
    formRef.current = form;
    const dirty = () => markDirty && markDirty();
    const clean = () => markClean && markClean();

    const loadSpend = React.useCallback(async (refresh) => {
        setSpend({ state: "loading" });
        try {
            setSpend({ state: "ok", data: await call("GET", "/spend", null, refresh ? { refresh: true } : undefined) });
        } catch (err) {
            setSpend({ state: "error", message: errorText(err) });
        }
    }, []);

    const loadModels = React.useCallback(async (refresh) => {
        setModels({ state: "loading" });
        try {
            setModels({ state: "ok", data: await call("GET", "/models", null, refresh ? { refresh: true } : undefined) });
        } catch (err) {
            setModels({ state: "error", message: errorText(err) });
        }
    }, []);

    const show = React.useCallback((s) => {
        setStatus(s);
        setForm({ apiKey: "", adminApiKey: "", clearAdminApiKey: false, model: s.model || "", effort: s.effort || "high", maxToolCalls: s.maxToolCalls || 25, maskPatterns: s.maskPatterns || "", responseLanguage: s.responseLanguage || "Automatic", reviewBeforeSending: s.reviewBeforeSending || "data", keepConversationsDays: s.keepConversationsDays || 0 });
        clean();
        loadModels(false);
        if (s.adminApiKeySet) loadSpend(false);
        else setSpend({ state: "idle" });
    }, [loadSpend, loadModels]);

    const load = React.useCallback(async () => {
        try {
            show(await call("GET", "/settings"));
            setError(null);
        } catch (err) {
            setError("加载设置失败：" + errorText(err));
        }
    }, [show]);

    /** Returns true when saved, false otherwise (the shell's unsaved-changes prompt relies on it). */
    const save = React.useCallback(async () => {
        const f = formRef.current;
        if (!f) return false;
        try {
            show(await call("PUT", "/settings", { ...f, maxToolCalls: Number(f.maxToolCalls) || 25, keepConversationsDays: Math.max(0, Math.min(365, Number(f.keepConversationsDays) || 0)) }));
            setError(null);
            P.ui.toast("Claude 助手设置已保存。", "success");
            return true;
        } catch (err) {
            setError("保存失败：" + errorText(err));
            return false;
        }
    }, [show]);

    const loadRef = React.useRef(load);
    loadRef.current = load;
    const saveRef = React.useRef(save);
    saveRef.current = save;

    React.useEffect(() => {
        if (setSave) setSave(() => saveRef.current());
        if (setTasks) {
            const { taskButton } = P.ui;
            setTasks("Claude 助手任务", [
                taskButton("刷新", "refresh", () => loadRef.current()),
                taskButton("保存", "save", () => saveRef.current(), { primary: true })
            ]);
        }
        loadRef.current();
    }, []);

    if (!form) return e("div", { className: "claude-settings" }, error ? e("div", { className: "claude-error" }, error) : "加载中…");

    const set = (key) => (ev) => {
        setForm({ ...form, [key]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value });
        dirty();
    };
    // Labels sit level with the first line of their field; plain text gets the same top padding.
    const row = (label, control, hint) => e("div", { className: "claude-row" }, e("label", null, label),
        e("div", null, typeof control === "string" ? e("div", { className: "claude-text-value" }, control) : control, hint ? e("div", { className: "claude-hint" }, hint) : null));

    // e.g. "1.2M 输入，18.4M 从缓存读取 (94% 的输入), 0.3M 写入缓存，0.2M output (插件的 API 密钥)"
    const compact = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
    const tokenLine = (t) => {
        if (!t) return "–";
        const total = t.input + t.cacheRead + t.cacheWrite;
        const share = total ? ` (${Math.round(100 * t.cacheRead / total)}% 的输入)` : "";
        return `${compact(t.input)} 输入，${compact(t.cacheRead)} 从缓存读取${share}, ${compact(t.cacheWrite)} 写入缓存，${compact(t.output)} 输出`
            + (t.scope === "pluginKey" ? " (插件的 API 密钥)" : " (组织)");
    };

    let spendLines;
    if (!status.adminApiKeySet) {
        spendLines = [row("本月用量：", "–", "设置管理员 API 密钥以显示本月用量。")];
    } else if (spend.state === "loading") {
        spendLines = [row("本月用量：", "加载中…")];
    } else if (spend.state === "error") {
        spendLines = [row("本月用量：", "–", spend.message)];
    } else if (spend.state === "ok") {
        const d = spend.data;
        const note = d.workspaceUsd != null ? null
            : d.pluginKeyName ? "插件的 API 密钥没有自己的工作区，因此仅显示组织总计。"
                : "此组织中未找到插件的 API 密钥，因此仅显示组织总计。";
        spendLines = [
            row("本月用量：", e("span", { className: "claude-inline" },
                e("span", { className: "claude-spend" }, `$${d.organizationUsd} (organization, since ${d.monthStart})`),
                e("button", { className: "btn", onClick: () => loadSpend(true) }, "523765b0")), note),
            d.workspaceUsd != null ? row("", `51764e2d5de54f5c533a '${d.workspaceName}' (插件的 API 密钥): $${d.workspaceUsd}`) : null,
            row("本月令牌：", tokenLine(d.tokens))
        ];
    }

    const modelList = models.state === "ok" ? models.data.models || [] : [];
    let modelHint;
    if (models.state === "loading") modelHint = "加载模型列表中…";
    else if (models.state === "error") modelHint = "无法加载模型列表：" + models.message + " 请输入模型 ID。";
    else if (models.state === "ok") {
        const d = models.data;
        const updated = d.fetchedAt ? ", updated " + new Date(d.fetchedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
        modelHint = d.warning ? e("span", { className: "claude-warning" }, d.warning)
            : d.source === "anthropic" ? `${modelList.length} 个来自 Anthropic 的模型${updated}. You can also type a model ID.`
                : (d.note || "显示的是固定列表。") + " 您也可以输入模型 ID。";
    }

    return e("div", { className: "claude-settings" },
        error ? e("div", { className: "claude-error" }, error) : null,
        row("Anthropic API 密钥：", e("input", { type: "password", value: form.apiKey, onChange: set("apiKey"), autoComplete: "off" }),
            status.apiKeySet ? "已设置：" + status.apiKeyHint : "尚未设置 API 密钥。"),
        row("模型：", e("span", { className: "claude-inline" },
            e("input", { type: "text", list: "claude-models", value: form.model, onChange: set("model"), style: { width: 260 } }),
            e("datalist", { id: "claude-models" }, modelList.map((m) => e("option", { key: m.id, value: m.id, label: m.unlisted ? m.displayName + " – 不在列表中" : m.displayName }))),
            e("button", { className: "btn", disabled: models.state === "loading", onClick: () => loadModels(true) }, "刷新列表")), modelHint),
        row("努力程度：", e("select", { value: form.effort, onChange: set("effort") }, EFFORTS.map((x) => e("option", { key: x, value: x }, x)))),
        row("响应语言：", e("select", { value: form.responseLanguage, onChange: set("responseLanguage") }, LANGUAGES.map(([value, label]) => e("option", { key: value, value }, label)))),
        row("每个问题的最大工具调用次数：", e("input", { type: "number", min: 1, max: 100, value: form.maxToolCalls, onChange: set("maxToolCalls"), style: { width: 80 } })),
        row("发送前审查：", e("select", { value: form.reviewBeforeSending, onChange: set("reviewBeforeSending") }, REVIEWS.map(([value, label]) => e("option", { key: value, value }, label))),
            "显示脱敏后将发送给 Claude 的完整内容，每个用户可以先编辑或扣留。"),
        row("保留对话（天）：", e("input", { type: "number", min: 0, max: 365, value: form.keepConversationsDays, onChange: set("keepConversationsDays"), style: { width: 80 } }),
            "对话在最后使用后在服务器上保留的天数，以便在 OIE 重启后可以继续（对话…）。仅保留发送给 Claude 的内容（已脱敏）。0 = 不保存：对话在最后使用 4 小时后或重启时消失。"),
        row("额外脱敏模式：", e("textarea", { rows: 4, value: form.maskPatterns, onChange: set("maskPatterns") }),
            "正则表达式，以 ;; 分隔。它们在内置规则（HL7 PID、NTE 和超过 30 个字符的文本、GDT 3000-3107、BSN）的基础上额外脱敏。API 密钥在服务器上加密存储，永远不会发送回管理器。留空密钥字段以保留当前密钥。"),
        e("h3", null, "用量"),
        row("管理员 API 密钥（可选）：", e("input", { type: "password", value: form.adminApiKey, onChange: set("adminApiKey"), autoComplete: "off" }),
            e("span", { className: "claude-inline" },
                status.adminApiKeySet ? "已设置：" + status.adminApiKeyHint : "未设置管理员 API 密钥。",
                status.adminApiKeySet ? e("label", null, e("input", { type: "checkbox", checked: form.clearAdminApiKey, onChange: set("clearAdminApiKey") }), " 移除管理员 API 密钥") : null)),
        ...spendLines,
        row("额度：", e("a", { className: "btn", href: BILLING_URL, target: "_blank", rel: "noopener noreferrer" }, "在控制台中打开账单")),
        row("", null, "用量数据来自 Anthropic Cost API，需要管理员 API 密钥（sk-ant-admin…，由组织管理员在控制台中创建）。以美元计，从每月 1 日（UTC）开始，最多延迟约 5 分钟。信用余额无法通过 API 获取；此按钮打开控制台的账单页面。"));
}

// ------------------------------------------------------------------ registration

function openWith(context, suggestion) {
    chat.open(context, suggestion);
    P.router.navigate("/claude");
}

export function register(platform) {
    P = platform;
    React = platform.React;
    e = React.createElement;

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    platform.registerIcon("claude", ICON_PATH);

    platform.registerNavItem({ id: "claude-assistant", label: "Claude 助手", icon: "claude", path: "/claude", section: "Plugins", order: 30 });
    platform.registerView("/claude", platform.reactView(ChatView), { title: "Claude 助手" });

    platform.registerChannelTab({ id: "claude-assistant", label: "Claude", order: 90, component: ChannelTab });

    platform.registerChannelAction({
        id: "claude-assistant.ask",
        label: "询问 Claude",
        icon: "claude",
        order: 60,
        onInvoke: (channel) => {
            if (!channel) return;
            openWith(`选中的通道：'${channel.name}' (${channel.id}).`, "分析此通道的状态和错误。");
        }
    });

    // The web admin has no hook on the Global Scripts view, so these go in the command palette.
    if (typeof platform.registerCommand === "function") {
        platform.registerCommand({ id: "claude-assistant.open", label: "Claude 助手", icon: "claude", section: "Plugins", keywords: ["claude", "ai", "assistant"], path: "/claude" });
        platform.registerCommand({
            id: "claude-assistant.global-scripts",
            label: "询问 Claude 关于全局脚本",
            icon: "claude",
            section: "Plugins",
            keywords: ["claude", "global scripts", "deploy", "preprocessor", "postprocessor"],
            run: () => openWith(GLOBAL_SCRIPTS_CONTEXT, GLOBAL_SCRIPTS_SUGGESTION)
        });
    }

    platform.registerCodeTemplateAction({
        id: "claude-assistant.ask",
        label: "询问 Claude",
        icon: "claude",
        order: 60,
        onInvoke: (template, ctx) => {
            if (!template || !template.id) return;
            const library = ctx && ctx.library && ctx.library.name ? ` 在库 '${ctx.library.name}'` : "";
            openWith(`选中的代码模板：'${template.name}' (${template.id})${library}. Claude 看到的是已保存的版本；代码模板编辑器中未保存的更改不可见。`,
                "解释此代码模板的功能、哪些通道使用它，并指出薄弱环节。");
        }
    });

    // Message actions arrived in @oie API 4.7; on an older web admin the option is simply absent.
    if (typeof platform.registerMessageAction === "function") {
        platform.registerMessageAction({
            id: "claude-assistant.ask",
            label: "询问 Claude",
            icon: "claude",
            order: 60,
            onInvoke: (message, ctx) => {
                const messageId = message && (message.messageId != null ? message.messageId : message.id);
                if (messageId == null) return;
                const channelId = (ctx && ctx.channelId) || (message && message.channelId);
                let context = `在消息浏览器中选中的消息：通道 ID ${channelId}，消息 ID ${messageId}`;
                if (ctx && ctx.metaDataId != null) context += `，连接器 (metaDataId) ${ctx.metaDataId}`;
                openWith(context + ".", "这条消息发生了什么？如果失败了：为什么，如何修复？");
            }
        });
    }

    platform.registerSettingsPanel({ label: "Claude 助手", component: SettingsPanel });
}
