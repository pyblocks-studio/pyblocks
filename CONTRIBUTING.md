# Contributing to PyBlocks Studio

Thank you for helping make visual Python clearer and safer.

1. Open an issue before a large behavioral or visual change.
2. Create a focused branch and preserve the Scratch/Blockly-inspired visual identity.
3. Do not modify `build.bat`, `update.bat`, or `update/FILES_TO_UPDATE.txt` without explicit owner approval.
4. Never edit vendored/minified dependency files manually; update them from an exact upstream release.
5. Add a regression test for every bug fix. Run `npm run check` before submitting a pull request.
6. Do not silently change generated Python meaning or discard imported source.
7. Keep the site static-host compatible and usable without an account.

The project currently has a custom source license. Before contributing, review `LICENSE.md`; contribution-licensing terms should be confirmed with the project owner for nontrivial submissions.
