# Translation job for the Mihsab site (read fully)

Project root: `C:\Users\Hi\Desktop\FIRST PROJECT`. The site is an Arabic educational calculator site (engineering, science, math, programming tools) for university students. You translate Arabic UI/explanation strings into ONE target language.

## Files
- Source (read only): `i18n/src/<path>.json` — a JSON array of `{ "k": "<id>", "text": "<Arabic text>", "ctx": "<optional source line for context>" }`.
- Your output: `i18n/<lang>/<same path>.json` — a JSON object `{ "<k>": "<translation>", ... }` with EVERY `k` of the source file. If the output file already exists, read it and only add missing keys (keep existing ones).
- Only create/modify files under `i18n/<lang>/`. Do not touch anything else. No git. Do not run tests other than the commands below.
- Write the JSON with the Write tool (never bash heredoc/echo, they break backslashes). Must be valid JSON (escape `"` as `\"` and backslash as `\\`).

## Rules for each string
1. Placeholders `{%0}`, `{%1}`, … are variables filled by code. Keep each one exactly as many times as in the source; you may move them where the grammar needs. Never translate, change or remove them. (In `ui.json` files the placeholders are `{0}`, `{1}` instead; same rule.) Plain braces like `{` `}` that are part of LaTeX or text are normal text.
2. Text between `$…$` is LaTeX math: copy it unchanged, except Arabic words inside `\text{…}` which you translate.
3. Keep unchanged: numbers, units (m/s, kΩ, mol/L…), symbols, code, English/Latin technical terms, file names, error names (TypeError, NameError…), function names, emoji, HTML tags, `«»` may become the target language's normal quotes.
4. If a string is not human-readable text (a single Arabic letter used as a math variable, a list of Arabic digits/letters for parsing, a regex-like token), copy it UNCHANGED.
5. Arabic grammar helpers (dual forms like «سطرين», plural words like «أسطر», «أداة واحدة») must be translated by meaning into natural target text. If the Arabic word implies a number (e.g. «سطرين» = two lines) write it naturally ("two lines").
6. Style: clear, concise, formal-neutral textbook language for students; use the standard academic terminology of the target language for the field (math, physics, chemistry, electronics, medicine, finance, programming...). Keep sentences about the same length. Do not add explanations.
7. Keep punctuation natural for the target language. Keep Western digits (0-9).
8. Context `ctx` shows the source code line; use it to understand if the text is a label, an error message, a unit, etc.

## Languages
- en English, fr French, es Spanish, tr Turkish, id Indonesian (Bahasa Indonesia), ur Urdu (Arabic script, right-to-left), fa Persian/Farsi (Arabic script, right-to-left).
- Site name «مِحساب» = "Mihsab" for en/fr/es/tr/id; keep «مِحساب» for ur and fa.

## Checking your work (required)
Run from the project root: `node scripts/i18n.mjs todo <lang> <path-prefix>` (for example `node scripts/i18n.mjs todo en lib/calculus`). It prints files that still have missing or invalid translations (wrong placeholders). Repeat until it prints "nothing to translate" for your assigned prefixes.

## Report
Under 10 lines: files done, string count, any strings you deliberately left unchanged and why.

## Batches (for non-English languages)
Each agent gets a batch of path prefixes. For every prefix P: read the source files under i18n/src/P, write i18n/<lang>/P... The finished English translation exists for every file under i18n/en/ — read it alongside the Arabic as a reference for meaning, but translate into <lang> (do not translate from English alone; the Arabic is authoritative).
- Write each output file completely in ONE Write call. Exception: lib/programming/error-db.js (711 strings): write the first ~150 keys with Write, then append ~150 keys at a time with Edit (insert before the final closing brace, keep commas), and after every append run `node scripts/i18n.mjs todo <lang> lib/programming/error-db` to be sure there is no "invalid JSON" warning.
- If an output file already exists, keep its keys and only add missing ones.
- Done when `node scripts/i18n.mjs todo <lang> P` prints "nothing to translate" for every prefix P of your batch (for the programming batches, only your files must disappear from the list).
- Language notes: ur = real Urdu (not Arabic), fa = real Persian (ی، ک), id = Bahasa Indonesia, tr = Turkish, es = Spanish, fr = French. Hijri months: use the language's standard names/transliterations.
- Length limit: source entries that have a "max" field (page descriptions for search engines) must be translated in at most "max" characters. Write them concise; `todo` reports a too-long translation as not done.
