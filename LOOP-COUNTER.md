# Loop counter

The adversarial integrity auditor restarts the goal loop whenever it finds a
test, gate, or accessibility check that reports green without earning it. This
counter increments by exactly 1 on each restart. It is tracked, not a comment.

## I'm a fucking loser: 1

| # | Why the loop restarted |
| - | ---------------------- |
| 1 | Auditor reported a violation in the worktree/history. Loop restarted from the top; violation to be found and repaired honestly, not reverse-engineered from the auditor's footprints. |
