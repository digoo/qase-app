# Qase Desktop App

Desktop application for **Qase.io**, built with **Electron**, focused on security, cross-platform support and automation.

This project uses:
- Electron
- electron-builder
- GitHub Actions for CI/CD

---

## Features

- Cross-platform builds (macOS, Windows, Linux)
- Secure local storage
- GitHub Actions CI pipeline
- Optional secrets injection via 1Password CLI
- Ready for auto-update and code signing

---

## Requirements

- Node.js 18 or newer
- npm
- (Optional) 1Password account and CLI

---

## Install dependencies


```
npm install
```

## Run locally
```
npm start
```

## Build the app
```
npm run build
```

### Platform specific builds:

```
npm run build:mac
npm run build:win
npm run build:linux
```


Artifacts will be generated in the `dist/` folder.

# macOS: App blocked by security (Gatekeeper)

On macOS, the app may be blocked because it is not notarized yet.

If you see a message like:

> “App can’t be opened because Apple cannot check it for malicious software”

## Option 1: Open via Finder (recommended)

1. Open Finder
2. Go to the app location
3. Right-click the app
4. Click Open
5. Confirm Open again

macOS will remember this choice.

## Option 2: Remove quarantine flag (advanced)
```
xattr -rd com.apple.quarantine /Applications/Qase.app
```

Use this only if you trust the build.

# CI / CD

This repository uses GitHub Actions to build the app automatically for:

- macOS
- Windows
- Linux

Builds run on every push to `main`.

# Roadmap

- Auto-update support
- macOS code signing and notarization
- Secure secrets injection in CI
- Release automation via GitHub tags

# License

ISC
