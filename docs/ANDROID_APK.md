# App Android nativa "Rotazioni Volley"

App **nativamente offline** per il tablet da campo (Samsung SM-T561, Android 4.4 KitKat):
nessun WebView, nessun browser, nessuna rete. Stessa interfaccia e stesse regole
della webapp React, reimplementate in **Rust + egui** con rendering OpenGL diretto
(glow / GLES2), sul modello già provato di `pointscreen`.

## Architettura

```
Cargo.toml            crate Rust "rotazioni" (package it.etinet.rotazionivolley)
src/model.rs          dominio: giocatori, zone, rotazioni, falli, libero, Under 13
src/storage.rs        persistenza JSON (squadre, formazioni, modalità) nei file privati dell'app
src/court.rs          rendering campo, zone, giocatori (egui painter)
src/app.rs            barra comandi, finestre (nomi, squadre, formazioni, salvataggio)
src/lib.rs            entry Android (NativeActivity), fullscreen, font, repaint forzato
src/kitkat_shim.rs    simboli mancanti su KitKat (getrandom, dl_iterate_phdr, ...)
vendor/egui_glow/     egui_glow 0.36.2 patchato per Mali-400 (vedi sotto)
res/                  icone launcher (generate da scripts/gen-icon.py)
scripts/kitkat-apk.sh post-processing APK per KitKat
```

Regole di dominio portate 1:1 dalla webapp (`src/components/VolleyballCourt.tsx`):
tabelle zone home/ospiti, rotazione singola/entrambe, controllo falli di posizione
(asimmetrico campo sinistro/destro, come la webapp), Libero su C1/C2 in seconda
linea (zone 1-6-5), mapping Under 13 (P→P, S1→Z4, C2→Z2, O→P, S2→Z4, C1→Z2),
nomi giocatori (max 15 char), tracciamento avversario, reset posizioni casa.

I dati (squadre, formazioni, modalità Under 13) sono salvati come JSON nella
directory privata dell'app e sopravvivono al riavvio. Nessun permesso di rete.

## Perché tre patch KitKat (API 19)

Il tablet ha un linker dinamico pre-Lollipop e una GPU Mali-400 (GLES2). Tre
problemi noti, tutti già risolti in `pointscreen` e replicati qui:

1. **Hash table SysV** — il linker di KitKat risolve i simboli solo tramite
   `DT_HASH`; l'NDK emette `GNU_HASH` e il caricamento fallisce senza alcun
   messaggio in logcat. `cargo apk` **ignora** `.cargo/config.toml`, quindi il
   flag va forzato via ambiente:
   ```
   RUSTFLAGS="-C link-arg=-Wl,--hash-style=sysv"
   ```
2. **Nessun symbol versioning** — le librerie NDK registrano `DT_VERNEED`/
   `DT_VERSYM`, che KitKat non sa soddisfare. `scripts/kitkat-apk.sh` riscrive
   quei tag in `DT_DEBUG`, riallinea (`zipalign`) e ri-firma (`apksigner`).
3. **Mali-400 e GLES2** — `vendor/egui_glow` (copiato da pointscreen) usa indici
   16-bit (la GPU non ha `OES_element_index_uint` e scarta i draw silenziosamente)
   e dichiara `precision highp float` incondizionato (il preprocessore Mali-4xx
   fallisce su `GL_FRAGMENT_PRECISION_HIGH`).

## Build locale

Toolchain: Rust stable con target `armv7-linux-androideabi`, `cargo-apk`,
NDK r27, JDK 17 (`~/android-toolchain/`).

```bash
export ANDROID_HOME=$HOME/android-toolchain/sdk
export NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973
export JAVA_HOME=$HOME/android-toolchain/jdk-17.0.20.1+1
export PATH=$JAVA_HOME/bin:$PATH
export RUSTFLAGS="-C link-arg=-Wl,--hash-style=sysv"
export CARGO_APK_RELEASE_KEYSTORE=/percorso/rotazioni.keystore
export CARGO_APK_RELEASE_KEYSTORE_PASSWORD=<password>

cargo apk build --release --lib --target armv7-linux-androideabi
KS_PASS=<password> bash scripts/kitkat-apk.sh --out rotazioni-android.apk
adb install -r rotazioni-android.apk
```

Il target dir di default (`target/`) è gitignored; su questa macchina si usa
`CARGO_TARGET_DIR=/home/diego/Documenti/dev/.cargo-target-rotazioni` perché
`/tmp` è un tmpfs troppo piccolo per il linker.

## CI

`.github/workflows/android.yml` (sullo stile di pointscreen): build armv7 con
`RUSTFLAGS` KitKat, `cargo test`, patch/align/re-sign via `scripts/kitkat-apk.sh`,
verifica automatica dei tag ELF (`DT_HASH` presente, niente `GNU_HASH`/`VERNEED`)
e upload dell'artifact **rotazioni-android**.

Senza secrets l'APK è firmato con un keystore throwaway generato al volo:
installabile, ma non aggiornabile sopra una firma diversa (disinstallare prima).
Per la firma definitiva:

```bash
gh secret set ANDROID_KEYSTORE_B64 < rotazioni.keystore.b64
gh secret set ANDROID_KEYSTORE_PASSWORD
```

## Verifica rapida su dispositivo

```bash
adb shell am start -n it.etinet.rotazionivolley/android.app.NativeActivity
adb shell screencap -p /sdcard/x.png && adb pull /sdcard/x.png
```
