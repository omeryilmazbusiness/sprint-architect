# GitHub Pages — Support & Privacy URLs

Static pages for App Store Connect (Support URL, Privacy Policy URL).

## Enable Pages (one time)

1. Open the repo on GitHub → **Settings** → **Pages**
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: **main** (or your default branch)
4. Folder: **/docs**
5. **Save**

After 1–3 minutes the site is live at:

```text
https://<GITHUB_USERNAME_OR_ORG>.github.io/<REPO_NAME>/
```

Example if user `omeryilmaz` and repo `sprint-architect`:

| Page | URL |
|------|-----|
| Home | `https://omeryilmaz.github.io/sprint-architect/` |
| Support | `https://omeryilmaz.github.io/sprint-architect/support/` |
| Privacy | `https://omeryilmaz.github.io/sprint-architect/privacy/` |

Replace with your real GitHub Pages URL from the green banner on the Pages settings screen.

## App Store Connect

| Field | Value |
|-------|--------|
| **Support URL** | `…/support/` |
| **Privacy Policy URL** | `…/privacy/` (under App Information) |
| **Marketing URL** (optional) | `…/` (home) |

## Edit content

- Support: [`docs/support/index.html`](support/index.html)
- Privacy: [`docs/privacy/index.html`](privacy/index.html)

Update contact emails (`support@healory.app`, `privacy@healory.app`) to addresses you actually monitor.

## Push changes

```bash
git add docs/
git commit -m "Add GitHub Pages support and privacy policy"
git push
```

Pages redeploy automatically after push to the configured branch.
