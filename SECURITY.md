# Security

thumb sends real taps, keystrokes and messages to a real phone signed into real accounts. Treat anything
that could make it act without the person's intent as a security issue.

**Please don't open a public issue for those.** Email ishangupta3121@gmail.com with:

- what the model or a malicious page/screen could make thumb do,
- steps to reproduce (macOS + iOS versions, the tool involved),
- a suggested fix if you have one.

You'll get a reply within a few days. Fixes ship as a patch release and the report is credited in the
release notes unless you'd rather it wasn't.

## Scope

In scope: prompt-injection paths through on-screen text (`describe_screen`, `tap_text`, `explore_app`
deny list), anything that bypasses the draft-then-confirm step for sending, and input landing outside
the mirroring window.

Out of scope: iPhone Mirroring itself (Apple), and permissions you granted to the host app on purpose.

## Design notes

- Sending tools draft by default and require a second, explicit call to send.
- `explore_app` never taps controls matching a deny list (send, pay, order, delete, log out, call,
  currency symbols, plan wording) and reports what it skipped.
- OCR runs on-device with Apple Vision; nothing leaves the machine.
