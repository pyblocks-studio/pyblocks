# Security Policy

## Reporting a vulnerability

Please use GitHub’s **Report a vulnerability** / private security advisory feature for this repository. Do not publish exploitable details in a public issue. Include affected files or versions, reproduction conditions, impact, and any safe remediation suggestion.

The project owner should acknowledge a report before disclosing a specific response timeline. Supported security fixes target the current release branch; older snapshots may not receive backports.

## Runtime boundary

PyBlocks runs user Python in a dedicated Web Worker using Skulpt. Stop/timeout terminates that worker. The runtime has no intentional access to page DOM, accounts, backend credentials, subprocesses, or the desktop filesystem. Treat imported `.pyblocks` and `.py` files as untrusted data; opening a project validates data but does not execute it.
