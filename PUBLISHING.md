# Publishing Setup

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and automated publishing to npm via GitHub Actions.

## Setup NPM Token

To enable automated publishing, you need to set up an NPM token in your GitHub repository secrets:

### 1. Generate an NPM Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** type (read and publish access)
5. Copy the generated token (it starts with `npm_...`)

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository: https://github.com/MartinEricsson/qoa-wasm
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

## Workflow

### Making Changes

1. Make your changes in a feature branch
2. Create a changeset describing your changes:
   ```bash
   pnpm changeset
   ```
3. Follow the prompts:
   - Select the type of change (major, minor, patch)
   - Write a summary of the changes
4. Commit the changeset file along with your changes
5. Push and create a pull request

### Release Process

Once your PR is merged to `main`:

1. The **Release** workflow automatically runs
2. Changesets bot creates/updates a "Version Packages" PR
3. Review the version bumps and changelog in the PR
4. When ready to release, merge the "Version Packages" PR
5. The workflow automatically:
   - Updates versions in `package.json`
   - Updates `CHANGELOG.md`
   - Creates git tags
   - Publishes to npm

## Manual Publishing (Alternative)

If you prefer to publish manually:

```bash
# Create a changeset
pnpm changeset

# Update versions (reads all changesets)
pnpm version

# Build, test, and publish
pnpm release
```

## Changeset Types

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

## Example Changeset

After running `pnpm changeset`, a file is created in `.changeset/` folder:

```markdown
---
"qoa-wasm": minor
---

Add support for streaming audio decoding
```
