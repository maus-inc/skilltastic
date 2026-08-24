#!/usr/bin/env bash
# Installs the Linux system libraries Tauri needs to build Skilltastic.
# Mirrors the helper mausVoice ships for its desktop workflow, trimmed to the
# dependencies this app actually links (no audio, pill, or gstreamer packages).
set -euo pipefail

sudo apt-get update

if apt-cache show libwebkit2gtk-4.1-dev >/dev/null 2>&1; then
  webkit_pkg="libwebkit2gtk-4.1-dev"
else
  webkit_pkg="libwebkit2gtk-4.0-dev"
fi

sudo apt-get install -y \
  build-essential \
  pkg-config \
  cmake \
  libgtk-3-dev \
  "${webkit_pkg}" \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
