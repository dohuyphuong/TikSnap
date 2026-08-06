---
name: Quick Mark MVP scope
description: Product scope decision for the first Quick Mark release.
---

Quick Mark's first release keeps photos, annotations, and recent history on the device. It does not require accounts, cloud sync, or a remote image backend.

**Why:** The product documents make cloud/backend features optional for MVP, while the core value is the fastest possible capture → mark → save/share loop.

**How to apply:** Preserve local-first behavior in follow-up work unless the user explicitly asks for authentication, cloud backup, or cross-device sync. Keep any future backend additive rather than blocking the core editor flow.