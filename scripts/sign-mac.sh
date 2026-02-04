#!/bin/bash
APP="/Applications/Qase.app"

echo "Signing $APP with ad-hoc signature..."
sudo codesign --force --deep --sign - "$APP"
sudo xattr -rd com.apple.quarantine "$APP"

echo "Done."
