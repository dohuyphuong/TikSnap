---
name: Expo Metro port selection
description: Production Expo bundle generation can run alongside the mockup preview workflow.
---

The Expo production build must select an available Metro port instead of assuming 8081.

**Why:** The managed mockup preview commonly occupies 8081, and Expo's non-interactive port prompt causes an otherwise healthy production build to fail.

**How to apply:** Keep the build process on a free localhost port and use that same port for health checks, bundle downloads, manifests, and asset downloads.