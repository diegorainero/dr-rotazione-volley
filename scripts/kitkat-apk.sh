#!/usr/bin/env bash
# KitKat (Android 4.4 / API 19) APK post-processing for rotazioni.
#
# Why: the .so linked by the NDK r27 toolchain records DT_VERNEED /
# DT_VERSYM symbol-versioning (libc LIBC ver 2, libm ver 3, libdl ver 4).
# KitKat's system libraries carry no version information at all, and its
# pre-versioning dynamic linker cannot satisfy a VERNEED against a libc with
# no verdefs, so NativeActivity fails with "Unable to load native library".
# This script rebuilds the APK with the versioning dynamic tags neutered
# (rewritten to DT_DEBUG, which loaders ignore in shared objects), then
# zipaligns and re-signs with the rotazioni keystore.
#
# Usage:
#   KS_PASS=<keystore-password> scripts/kitkat-apk.sh [--out <path>] [--skip-build]
# Env:
#   KS_PASS      (required) keystore password for apksigner
#   KS           (optional) keystore path, default: /tmp/opencode/rotazioni/rotazioni.keystore
#   KS_ALIAS     (optional) key alias inside the keystore, default: rotazioni
#   SERIAL       (optional) adb device serial, default: 3801ad9356305300
#   SKIP_INSTALL (optional) set to 1 to skip install/launch verification
set -euo pipefail

OUT="/tmp/opencode/rotazioni/rotazioni-kitkat.apk"
SKIP_BUILD=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --out) OUT="$2"; shift 2 ;;
        --skip-build) SKIP_BUILD=1; shift ;;
        *) echo "unknown arg: $1" >&2; exit 2 ;;
    esac
done
# Make the output path absolute: we later cd into a temp workdir.
case "$OUT" in
    /*) ;;
    *) OUT="$(pwd)/$OUT" ;;
esac

: "${KS_PASS:?KS_PASS env var is required (keystore password)}"
KS="${KS:-/tmp/opencode/rotazioni/rotazioni.keystore}"
KS_ALIAS="${KS_ALIAS:-rotazioni}"
SERIAL="${SERIAL:-3801ad9356305300}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Local dev machine keeps the Android toolchain in ~/android-toolchain;
# CI runners expose the standard ANDROID_HOME layout.
if [[ -n "${ANDROID_HOME:-}" && -x "$ANDROID_HOME/build-tools/34.0.0/zipalign" ]]; then
    BUILD_TOOLS="$ANDROID_HOME/build-tools/34.0.0"
    ZIPALIGN="$BUILD_TOOLS/zipalign"
    APKSIGNER="$BUILD_TOOLS/apksigner"
elif [[ -x "$HOME/android-toolchain/sdk/build-tools/34.0.0/zipalign" ]]; then
    BUILD_TOOLS="$HOME/android-toolchain/sdk/build-tools/34.0.0"
    ZIPALIGN="$BUILD_TOOLS/zipalign"
    APKSIGNER="$BUILD_TOOLS/apksigner"
else
    ZIPALIGN="$(dirname "$(find "$HOME/android-toolchain/sdk/build-tools" -name zipalign | sort | tail -1)")/zipalign"
    APKSIGNER="$(dirname "$(find "$HOME/android-toolchain/sdk/build-tools" -name apksigner | sort | tail -1)")/apksigner"
fi
[[ -x "$ZIPALIGN" ]] || { echo "zipalign not found" >&2; exit 1; }
[[ -x "$APKSIGNER" ]] || { echo "apksigner not found" >&2; exit 1; }

WORK="$(mktemp -d "${TMPDIR:-/tmp}/kitkat-apk.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# apksigner is a java program: make sure java is reachable regardless of
# whether we are building too.
if ! command -v java >/dev/null 2>&1; then
    if [[ -x "$HOME/android-toolchain/jdk-17.0.20.1+1/bin/java" ]]; then
        export PATH="$HOME/android-toolchain/jdk-17.0.20.1+1/bin:$PATH"
    elif [[ -x "/usr/lib/jvm/jdk-17/bin/java" ]]; then
        export PATH="/usr/lib/jvm/jdk-17/bin:$PATH"
    fi
fi

# Resolve the toolchain only when we actually build (SKIP_BUILD=1 callers,
# e.g. CI, already provide their own ANDROID_HOME / JAVA_HOME).
if [[ "$SKIP_BUILD" == "0" ]]; then
    export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-toolchain/sdk}"
    if [[ -z "${NDK_HOME:-}" ]]; then
        NDK_HOME="$(ls -d "$ANDROID_HOME"/ndk/* 2>/dev/null | sort | tail -1)"
        export NDK_HOME
    fi
    export JAVA_HOME="${JAVA_HOME:-$HOME/android-toolchain/jdk-17.0.20.1+1}"
    export PATH="$JAVA_HOME/bin:$PATH"
fi
# cargo-apk requires a release keystore even though we re-sign afterwards;
# its signature is simply replaced by apksigner at the end of this script.
export CARGO_APK_RELEASE_KEYSTORE="$KS"
export CARGO_APK_RELEASE_KEYSTORE_PASSWORD="$KS_PASS"

# 1) Build the release APK (armv7) with cargo-apk.
cd "$ROOT_DIR"
if [[ "$SKIP_BUILD" == "0" ]]; then
    cargo apk build --release --lib --target armv7-linux-androideabi
fi
APK_IN="target/release/apk/rotazioni.apk"
[[ -f "$APK_IN" ]] || APK_IN="target/armv7-linux-androideabi/release/apk/rotazioni.apk"
[[ -f "$APK_IN" ]] || APK_IN="${CARGO_TARGET_DIR:-}/release/apk/rotazioni.apk"
[[ -f "$APK_IN" ]] || APK_IN="${CARGO_TARGET_DIR:-}/armv7-linux-androideabi/release/apk/rotazioni.apk"
[[ -f "$APK_IN" ]] || { echo "APK not found: $APK_IN" >&2; exit 1; }
case "$APK_IN" in
    /*) APK_ABS="$APK_IN" ;;
    *)  APK_ABS="$ROOT_DIR/$APK_IN" ;;
esac

# 2) Unpack, patch the native libs, repack.
cd "$WORK"
unzip -o -q "$APK_ABS"
python3 - "$WORK" <<'PYEOF'
import glob, struct, sys

root = sys.argv[1]
DT_DEBUG = 0x15
VERSION_TAGS = {0x6FFFFFF0: "VERSYM", 0x6FFFFFFE: "VERNEED", 0x6FFFFFFF: "VERNEEDNUM"}

def patch(path):
    with open(path, "rb") as f:
        data = bytearray(f.read())
    is64 = data[4] == 2  # e_ident[EI_CLASS]
    if is64:
        e_phoff = struct.unpack_from("<Q", data, 0x20)[0]
        e_phentsize, e_phnum = struct.unpack_from("<HH", data, 0x36)
        phdr_fmt, dyn_fmt, dyn_size = "<IIQQQQQQ", "<QQ", 16
    else:
        e_phoff = struct.unpack_from("<I", data, 0x1C)[0]
        e_phentsize, e_phnum = struct.unpack_from("<HH", data, 0x2A)
        phdr_fmt, dyn_fmt, dyn_size = "<IIIIIIII", "<II", 8
    dynamic_off = dynamic_size = None
    for i in range(e_phnum):
        off = e_phoff + i * e_phentsize
        fields = struct.unpack_from(phdr_fmt, data, off)
        if fields[0] == 2:  # PT_DYNAMIC
            dynamic_off = fields[2] if is64 else fields[1]
            dynamic_size = fields[5] if is64 else fields[4]
            break
    if dynamic_off is None:
        print(f"{path}: no PT_DYNAMIC, skipped")
        return
    patched = []
    pos = dynamic_off
    end = dynamic_off + dynamic_size
    while pos + dyn_size <= end:
        d_tag, d_val = struct.unpack_from(dyn_fmt, data, pos)
        if d_tag == 0:
            break
        if d_tag in VERSION_TAGS:
            struct.pack_into(dyn_fmt, data, pos, DT_DEBUG, d_val)
            patched.append(VERSION_TAGS[d_tag])
        pos += dyn_size
    with open(path, "wb") as f:
        f.write(data)
    print(f"{path}: patched {len(patched)} tags -> DT_DEBUG: {', '.join(patched) if patched else 'none'}")

for lib in glob.glob(f"{root}/lib/*/librotazioni.so"):
    patch(lib)
PYEOF

# 3) Repack and align.
zip -qr "$WORK/unaligned.apk" .
"$ZIPALIGN" -f 4 "$WORK/unaligned.apk" "$WORK/aligned.apk"

# 4) Re-sign (replaces cargo-apk's signature).
"$APKSIGNER" sign --ks "$KS" --ks-pass "pass:$KS_PASS" \
    --key-pass "pass:$KS_PASS" --out "$WORK/final.apk" "$WORK/aligned.apk"

mkdir -p "$(dirname "$OUT")"
cp "$WORK/final.apk" "$OUT"
echo "==> KitKat APK written to $OUT"

# 5) Verify: no versioning dynamic tags remain, imports are unversioned.
LIBDIR="$WORK/lib/armeabi-v7a"
echo "==> readelf -d version tags (expect 0):"
readelf -d "$LIBDIR/librotazioni.so" | grep -cE 'VERNEED|VERSYM' || true
echo "==> dynsym with @version (expect none):"
readelf --dyn-syms -W "$LIBDIR/librotazioni.so" | grep -c '@' || true

# 6) Install, launch, verify on the tablet.
if [[ "${SKIP_INSTALL:-0}" == "1" ]]; then
    echo "==> SKIP_INSTALL=1: skipping device verification"
    exit 0
fi
adb -s "$SERIAL" install -r "$OUT"
adb -s "$SERIAL" shell am start -n it.etinet.rotazionivolley/android.app.NativeActivity
sleep 3
echo "==> process check:"
adb -s "$SERIAL" shell "ps | grep rotazionivolley" || true
echo "==> FATAL lines in logcat (expect none):"
adb -s "$SERIAL" logcat -d > "$WORK/logcat.txt"
grep -c "FATAL" "$WORK/logcat.txt" || true
