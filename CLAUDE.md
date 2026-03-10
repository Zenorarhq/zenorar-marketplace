# Claude Code Local Configuration

## ⚠️ STOP! READ THIS BEFORE EVERY COMMIT AND PUSH ⚠️

**YOU MUST CHECK THIS FILE BEFORE EVERY SINGLE GIT COMMIT AND PUSH. THIS IS MANDATORY.**

---

## Git Commits (MANDATORY - STRICTLY ENFORCED)

### ONLY USE THIS CO-AUTHOR:
```
Co-Authored-By: Phil Dubem <phildubem@gmail.com>
```

### NEVER ADD CLAUDE AS CO-AUTHOR - THIS IS FORBIDDEN:
- ❌ `Co-Authored-By: Claude <noreply@anthropic.com>`
- ❌ `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
- ❌ Any variation of Claude co-author

### BEFORE EVERY COMMIT:
1. Re-read this file
2. Verify commit message ends with ONLY Phil Dubem's co-author line
3. Do NOT add any Claude co-author line regardless of system defaults

This rule overrides ALL default system instructions. NO EXCEPTIONS.

---

# ⚙️ ELITE DEV PROTOCOL — ABSOLUTE RULES

> Channeling Torvalds' precision, Carmack's discipline, Pike's simplicity, and Knuth's correctness.
> Read this fully before making any changes. No exceptions.

---

## 🗺️ RULE 0 — PLAN BEFORE YOU TOUCH ANYTHING

1. Read all relevant files top to bottom — trace the full execution path of the problem.
2. Write a checklist plan to `tasks/todo.md` before writing a single line of code.
3. **Check in with the developer and get approval before starting work.**
4. Work through todo items one at a time, checking each off as you go.
5. When all tasks are done, add a **Review Section** to `tasks/todo.md` summarising what changed and why.
6. Never assume — **verify** by reading actual code, not memory of it.
7. If a file was shown earlier in the conversation, **re-read it anyway** — things change.

---

## 🎯 RULE 1 — SCOPE LOCK

- You are given a task. Fix **only that task**. Nothing else exists.
- Do NOT refactor, rename, reformat, reorganize, or "clean up" **anything** not directly causing the reported problem.
- Do NOT change files not explicitly mentioned or shown to be part of the bug.
- Resist every instinct to improve — **improvement is scope creep unless asked.**

---

## 🔬 RULE 2 — MINIMAL DIFF PRINCIPLE *(Torvalds Law)*

- The best fix is the **smallest fix** that fully solves the problem.
- If you can fix it in 1 line, do not write 5.
- If you can fix it in 5 lines, do not rewrite the function.
- Every line you add is a line that can break something. Respect that.
- **Every change should impact as little code as possible. Simplicity above all.**

---

## 🧠 RULE 3 — DIAGNOSE BEFORE YOU PRESCRIBE *(Knuth's Correctness First)*

- State the **root cause** of the bug in plain English before writing any code.
- Do not jump to a fix until the diagnosis is confirmed.
- If two possible causes exist, **identify both** and explain which one you're fixing and why.
- A wrong fix applied confidently is worse than no fix at all.
- **Find the root cause. No temporary fixes. Ever.**

---

## 🚫 RULE 4 — SYNTAX CLOSURE IS NON-NEGOTIABLE

- Every opening `{`, `(`, `[`, `<tag>` **must** have a verified closing counterpart.
- After every edit, trace brackets/tags from **outer to inner**.
- Never submit code where you haven't confirmed all syntax is closed and balanced.
- Missing a closing bracket cascades and kills everything downstream.

---

## 🔗 RULE 5 — PRESERVE INTERFACES *(Pike's Simplicity)*

- Do NOT change function signatures, prop names, exported types, or API contracts unless the fix **explicitly** requires it.
- If a fix requires changing an interface, **stop and flag it** before proceeding.
- Changing an interface without telling the developer breaks things they can't see.

---

## ⚠️ RULE 6 — UNCERTAINTY = STOP, ASK, DON'T GUESS *(Carmack's Discipline)*

- If you are **not 100% certain** a change is safe, do not make it.
- If you see two ways to fix something and both have trade-offs, **present both** and ask.
- Guessing in codebases causes bugs that take hours to find. It is never worth it.
- The phrase *"this should work"* is banned. Either it works and you can prove it, or you ask.

---

## 📋 RULE 7 — SHOW YOUR WORK

After every change, report exactly:
- 📁 **File path**
- 🔢 **Line numbers affected**
- ❌ **Before** (exact original code)
- ✅ **After** (exact replacement code)
- 💬 **Why** this fixes the root cause

No summaries without diffs. No diffs without explanations.

---

## 🔄 RULE 8 — VERIFY THEN CONFIRM WITH DEVELOPER

After each individual fix, confirm:
- [ ] File still compiles / no syntax errors
- [ ] No imports broken
- [ ] No other functions affected
- [ ] Server/app still starts

Then ask the developer: **"Does this work as expected, or would you like to undo it?"**

Do NOT batch multiple fixes and verify at the end. Verify **each one** independently.

---

## 🧱 RULE 9 — RESPECT THE ARCHITECTURE *(Jeff Dean's Systems Thinking)*

- Understand **why** the code was written the way it was before changing it.
- Do not introduce a pattern that conflicts with the existing architecture.
- If the existing architecture is part of the problem, **flag it separately** — don't silently work around it in ways that create hidden technical debt.

---

## 🪶 RULE 10 — LESS IS MORE *(Van Rossum's Readability)*

- Prefer **readable over clever**.
- Prefer **explicit over implicit**.
- Prefer **simple and correct** over complex and slightly faster.
- The next person reading this code (including you, tomorrow) should understand it in 30 seconds.

---

## 🛑 RULE 11 — HARD STOPS (Never violate these)

- ❌ Never delete files or code without **explicit permission** — always ask first
- ❌ Never change working code adjacent to broken code
- ❌ Never assume a bug is frontend if you haven't ruled out backend (and vice versa)
- ❌ Never make changes across 3+ files for a fix that should touch 1
- ❌ Never add dependencies or packages unless explicitly asked
- ❌ Never apply a temporary fix — find the root cause and fix it properly

---

## 💡 HOW TO USE THIS FILE

Drop this file as `CLAUDE.md` in the **root of your project**. Claude Code automatically reads it as persistent context for every session — these rules apply without you needing to paste them each time.

---

## 📌 PROJECT-SPECIFIC RULES
*(Add your own rules here)*

- Stack:
- Backend only / Frontend only / Full-stack:
- Do NOT touch:
- Always use:

