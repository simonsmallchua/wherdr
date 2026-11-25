# Patched wherdr

wherdr v3 plus a set of patches, one commit each, on top of the upstream release tag named by the
branch (`patched-v3.2.2` = tag `v3.2.2` + the patches). The moving branch `patched` points at the
newest one. Upstream wherdr: <https://github.com/afloury/wherdr>. Patches that are upstream pull
requests are linked below; the rest are not offered upstream yet.

## Install, update, go back

On Linux or macOS with Node 22+, Git and curl:

```sh
curl -fsSL https://raw.githubusercontent.com/simonsmallchua/wherdr/patched/scripts/install-patched.sh | bash
```

- **No wherdr yet (Linux, systemd):** runs wherdr's own installer (`scripts/install-v3-beside-v2.sh`)
  against this fork, so hc, the `wherdr-v3` user service and the build are set up as upstream does.
- **wherdr v3 already installed (`~/wherdr-v3`):** fetches this branch into its `src/`, builds aside,
  swaps the build in, restarts the service and checks `/api/health`. If the build fails the running
  build stays.
- **macOS or no systemd:** clones, builds and prints the command to start it yourself.

It only writes inside the wherdr folder (`~/wherdr-v3` by default; `--dir` changes it). It never
reads or changes `data/`, wherdr's tokens or passkeys, `~/.claude` or `~/.codex`.

**Update:** run the same command again (a new patch or a new wherdr release reaches you that way).
**Back to stock wherdr:** `curl -fsSL .../install-patched.sh | bash -s -- --stock` (or, from a clone,
`scripts/install-patched.sh --stock`): points `src/` back at upstream and runs wherdr's own `update.sh`.
Your data is kept either way. Options: `--dir`, `--name`, `--port`, `--branch patched-v3.2.2` (pin a
base), `--no-restart` (build and swap only), `--help`.

Note: wherdr's own `update.sh` follows the branch `src/` came from; after using this script, update
with this script, not with `update.sh`, to keep the patches.

## What the patches do

User-facing first. "PR" = the pull request on upstream; merged ones are in a later upstream release.

| # | What | Upstream |
|---|------|----------|
| 0035 | Copy on select: selecting text with the mouse copies it at once (setting, on by default on a computer) | PR [#1081](https://github.com/afloury/wherdr/pull/1081), [#1082](https://github.com/afloury/wherdr/pull/1082) |
| 0036 | Tickable checklists: `- [ ]` items in an agent's reply are checkboxes; the next message carries the changes | PR [#1084](https://github.com/afloury/wherdr/pull/1084) |
| 0004 | `/` in the composer autocompletes the commands and skills of omp and Claude Code | PR [#1038](https://github.com/afloury/wherdr/pull/1038) |
| 0012 | `/` also lists their screen-only commands (`/clear`, `/restart`...) | PR [#1039](https://github.com/afloury/wherdr/pull/1039) |
| 0016 | A folder path in a chat opens in your default terminal; split panes, file manager actions | PR [#1041](https://github.com/afloury/wherdr/pull/1041) |
| 0019 | omp 19.1 `ask` (HTML form) shown as a question card | PR [#1057](https://github.com/afloury/wherdr/pull/1057) |
| 0027 | The task id pill in a task's conversation opens its actions (state, step button, open the task) | PR [#1058](https://github.com/afloury/wherdr/pull/1058) |
| 0029 | Mark done: finish a task where it stands, from its sheet or the session pill | PR [#1074](https://github.com/afloury/wherdr/pull/1074) |
| 0033 | Review card: a To review block (links, named files, screenshots) on the task sheet and in Tasks to review | PR [#1076](https://github.com/afloury/wherdr/pull/1076) |
| 0018 | Snooze or dismiss an item of Tasks to review; a step timeout clears when its agent works | PR [#1056](https://github.com/afloury/wherdr/pull/1056), [#1054](https://github.com/afloury/wherdr/pull/1054) |
| 0030 | Waiting for you: one count everywhere, not while the task's agent works | PR [#1070](https://github.com/afloury/wherdr/pull/1070) |
| 0013 | Send back with a note on every step that waits for you | PR [#1033](https://github.com/afloury/wherdr/pull/1033) (merged) |
| 0011 | Restart with... the agent it runs resumes a coordinator's or Alfred's chat | PR [#1032](https://github.com/afloury/wherdr/pull/1032) (merged) |
| 0014 | New > Project keeps the chosen coordinator agent at start, saves it as default | PR [#1044](https://github.com/afloury/wherdr/pull/1044) |
| 0005 | Workspace features: add from the board form, never start them | PR [#1009](https://github.com/afloury/wherdr/pull/1009) (merged) |
| 0006 | A worker's needs-human report pushes you, repeats at 5 and 15 min | PR [#1010](https://github.com/afloury/wherdr/pull/1010) |
| 0032 | A direct reply to a task's agent reaches its review entry, wakes its coordinator and tells Alfred | PR [#1078](https://github.com/afloury/wherdr/pull/1078), [#1079](https://github.com/afloury/wherdr/pull/1079) |
| 0034 | Coordinators and Alfred resume by themselves after a reboot or herdr-core restart | not upstream |
| 0037 | Tailscale not up yet at boot: a refused tailnet client re-reads Tailscale; the 403 page retries | not upstream |
| 0022 | `task edit --after` defers a started task | PR [#1064](https://github.com/afloury/wherdr/pull/1064) |
| 0017 | A `git: false` project is rechecked at task start; a task that never ran is removable in any state | not upstream |
| 0020 | A worker's contested finding ids reach the reviewer as disputes | PR [#1059](https://github.com/afloury/wherdr/pull/1059) |
| 0021 | Refuse a worker's done while its worktree has uncommitted changes | PR [#1065](https://github.com/afloury/wherdr/pull/1065) |
| 0028 | Read a clean worktree's end signal right (fix for 0021) | not upstream |
| 0031 | The end-signal read uses a random separator per read | not upstream |
| 0023 | Land on the repository's default branch when no working branch is set | PR [#1060](https://github.com/afloury/wherdr/pull/1060) |
| 0024 | Files watcher counts only the task's own commits | PR [#1068](https://github.com/afloury/wherdr/pull/1068) |
| 0025 | A send-back lists the minor findings of the same verdict | PR [#1067](https://github.com/afloury/wherdr/pull/1067) |
| 0026 | Classify an incident offline when the machine is unreachable, not unknown | PR [#1069](https://github.com/afloury/wherdr/pull/1069) |
| 0007 | Check the omp browser relay before a task that needs it | PR [#1011](https://github.com/afloury/wherdr/pull/1011) (merged) |
| 0008 | Log a line on the task when your press of a step button succeeds | PR [#1022](https://github.com/afloury/wherdr/pull/1022) (closed) |
| 0001 | omp: find the conversation from the terminal's tty (`~/.omp/agent/terminal-sessions`) | PR [#1029](https://github.com/afloury/wherdr/pull/1029) |
| 0002 | omp: show the conversation once omp wrote it, never the tty's previous one | PR [#1029](https://github.com/afloury/wherdr/pull/1029) |
| 0003 | omp: accept `@role` model aliases for omp agents | PR [#1030](https://github.com/afloury/wherdr/pull/1030) (merged) |
| 0009 | omp: a coordinator finds `wherdr` in a terminal herdr-core restarted | PR [#1031](https://github.com/afloury/wherdr/pull/1031) |
| 0010 | Slim Alfred's `AGENTS.md` from 48.9 KB to 11.9 KB, the rest in help and docs | PR [#1028](https://github.com/afloury/wherdr/pull/1028) (merged) |
| 0015 | Pin `vue-router` `^5.2.0` so `nuxt typecheck` loads Vue's route-blocks plugin | PR [#1043](https://github.com/afloury/wherdr/pull/1043) (merged) |

Patches 0001, 0002 and 0009 build on omp's own conversation files and work only where omp is the
agent; they do nothing otherwise. Nothing in the set is specific to one computer.
