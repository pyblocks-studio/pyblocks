# Repository Hardening Implementation Report

Date: 2026-08-01
Branch: `audit/repository-hardening`
Audit source: `AUDIT.md`

## Completion summary

All 50 audited areas were addressed in this branch. Where the audit explicitly offered alternatives, the implementation chose the safer bounded option:

- Python source import was removed by product decision. `.py` is export-only; `.pyblocks` is the editable project format.
- The runtime uses a vendored, pinned Skulpt interpreter in a terminable Web Worker. It does not translate Python to JavaScript with regular expressions.
- Modules not supported by the browser interpreter remain available for desktop-Python export but are visibly marked **Export only**.
- The project license now explicitly separates original PyBlocks work from Blockly and Skulpt third-party components.

## Audit disposition

| Audit IDs             | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01–A-03             | Replaced the line/regex interpreter with real Python parsing and execution in `python-worker.js`; added precedence, nested control flow, recursion, list/string, exception, and division tests.                                                                                                                                                                                                                                                   |
| A-04, A-07–A-09       | Added debounced autosave/restore, dirty/saved status, versioned `.pyblocks` Save/Open/New, libraries/settings persistence, validation, migration, and destructive-action confirmation.                                                                                                                                                                                                                                                            |
| A-05–A-06             | Python source import was removed by product decision. Project opening continues to validate fully before replacing the workspace.                                                                                                                                                                                                                                                                                                                 |
| A-10–A-12             | Worker isolation, Stop/reset, ten-second project timeout, run locking, stale-message tokens, and asynchronous in-console input.                                                                                                                                                                                                                                                                                                                   |
| A-13–A-25             | Corrected precedence and escaping; moved variables to Blockly’s variable model; added structured function parameter mutator and synchronized calls; native dynamic list and conditional mutators; statement/value list and call separation; dynamic print/min/max/library arguments; optional round; all range and slice forms; chained comparisons; import/from-import aliases; positional and keyword library arguments; deterministic imports. |
| A-19                  | Raw source preserves internal blank lines/comments/indentation; generated suite bodies receive `pass`. Ordinary visual comments remain Python line comments; multiple lines can be represented by stacked comment blocks or lossless raw source.                                                                                                                                                                                                  |
| A-20, A-33, A-35–A-40 | Size/schema/version/prototype-key validation, guarded startup, safe DOM text construction, CSP, focused project/export/console/dialog/runtime modules, consistent error paths, cached DOM references, and user-facing recovery messages.                                                                                                                                                                                                          |
| A-26–A-27             | Beginner-facing Python exception type/message/line/source, best-effort responsible-block selection, safe editable filenames, UTF-8 final newline, delayed object-URL cleanup, repeated exports, and mobile Web Share support.                                                                                                                                                                                                                     |
| A-28–A-34, A-44–A-46  | Live resolved system theme for HTML and Blockly, focus trapping/restoration/inert background, keyboard menus, visible focus, phone/tablet/landscape/safe-area layouts, `ResizeObserver`, persistent/resettable accessibility settings, OS reduced-motion default, high contrast, large text, mute control, and guarded sound loading.                                                                                                             |
| A-41–A-42             | Added Node unit/generator tests, real-runtime browser tests, Playwright Chromium/WebKit/mobile projects, axe accessibility checks, ESLint, Prettier, npm audit, and GitHub Actions. Every custom generator has deterministic disconnected-output coverage plus nested/representative tests.                                                                                                                                                       |
| A-43, A-47–A-50       | Rewrote README; added architecture/runtime/import/persistence/deployment/update documentation, screenshot, CONTRIBUTING, SECURITY, third-party notices/licenses, EditorConfig, Dependabot, issue/PR templates, and protected update-file hash tests. License terms remain unchanged.                                                                                                                                                              |

## Verification results

- Unit and generator tests: **19 passed, 0 failed**
- Browser matrix: **90 collected; 39 executed, 51 intentionally skipped as duplicate engine-independent cases; 0 failed**
- Runtime smoke cases: arithmetic, nested conditions, loops, recursion, input, lists/strings, exceptions, interruption, and output isolation all pass
- Browser engines: Chromium and WebKit
- Viewports: desktop, iPhone SE, iPhone 15, iPhone landscape, and iPad Pro
- Automated accessibility: no serious or critical axe violations on Home, Editor, or License
- ESLint: passed
- Prettier check: passed
- npm audit: **0 vulnerabilities**
- Protected files: `update.bat` and `update/FILES_TO_UPDATE.txt` match their baseline SHA-256 hashes

## Performance and bundle impact

- Baseline first-party HTML/CSS/JS: 86,655 bytes
- Audited first-party HTML/CSS/JS: 155,172 bytes
- Vendored Blockly: 829,294 bytes
- Added vendored Skulpt runtime: 968,339 bytes uncompressed
- Skulpt transfer estimate with gzip: about 234,889 bytes
- Blockly JavaScript transfer estimate with gzip: about 219,626 bytes

The editor UI no longer freezes during user-code execution because Python runs in a worker. The principal cost is the one-time Skulpt worker download/parse; same-origin browser caching applies on later runs. No framework or backend was added.

## Known, explicitly disclosed limitations

1. Skulpt is not CPython. Native extensions, subprocesses, sockets, unrestricted network access, and desktop filesystem access are unavailable. Export-only modules require desktop Python.
2. Python source is export-only. Users must keep a local or cloud `.pyblocks` project to resume visual editing.
3. Error-to-block selection is best effort when identical generated source lines exist; the exception line and source text are always shown.
4. GitHub Pages cannot set `frame-ancestors` through a meta CSP. A hosting provider with response-header control should add that directive.
5. Automated browser coverage is Chromium and WebKit. Firefox is expected to work but is not part of the required matrix.
6. Blockly’s own workspace keyboard navigation remains subject to upstream Blockly limitations; PyBlocks-owned controls are keyboard tested.

## Owner decisions

No decision blocks this implementation. Future owner choices are:

- whether to reintroduce a complete Python-AST-to-block converter;
- whether to replace Skulpt with the larger CPython/Pyodide runtime;
- what formal contribution-licensing terms should accompany the project’s custom source license.
