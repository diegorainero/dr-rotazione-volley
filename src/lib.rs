//! rotazioni library: shared app logic for desktop and Android.

pub mod app;
pub mod court;
pub mod model;
pub mod storage;

// KitKat (API 19) symbol shims: armv7 links with -Wl,--wrap (see
// .cargo/config.toml); desktop/iOS builds never see this module.
#[cfg(target_os = "android")]
mod kitkat_shim;

use eframe::egui::{self, FontData, FontDefinitions};

/// DejaVu Sans, embedded so the binary needs no system font on Android.
const DEJAVU_FONT: &[u8] = include_bytes!("../assets/fonts/DejaVuSans.ttf");

/// Register the embedded font as the proportional default.
pub fn setup_fonts(cc: &eframe::CreationContext) {
    let mut fonts = FontDefinitions::default();
    fonts.font_data.insert(
        "DejaVuSans".to_owned(),
        std::sync::Arc::new(FontData::from_static(DEJAVU_FONT)),
    );
    fonts
        .families
        .entry(egui::FontFamily::Proportional)
        .or_default()
        .insert(0, "DejaVuSans".to_owned());
    cc.egui_ctx.set_fonts(fonts);
}

/// Debug wrapper: forces a continuous repaint loop. winit-android's deferred
/// repaint never fires spontaneously on KitKat (RedrawRequested is only
/// delivered in reaction to input events), so without this the first ui()
/// never runs.
#[cfg(target_os = "android")]
struct FrameLogger {
    inner: Box<dyn eframe::App>,
}

#[cfg(target_os = "android")]
impl eframe::App for FrameLogger {
    fn logic(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
        self.inner.logic(ctx, frame);
        ctx.request_repaint_after(std::time::Duration::from_millis(16));
    }

    fn ui(&mut self, ui: &mut egui::Ui, frame: &mut eframe::Frame) {
        static FIRST: std::sync::Once = std::sync::Once::new();
        FIRST.call_once(|| log::info!("App::ui FIRST frame"));
        self.inner.ui(ui, frame);
    }

    fn clear_color(&self, visuals: &egui::Visuals) -> [f32; 4] {
        self.inner.clear_color(visuals)
    }
}

#[cfg(target_os = "android")]
fn wrapped_app(data_dir: Option<std::path::PathBuf>) -> Box<dyn eframe::App> {
    Box::new(FrameLogger {
        inner: Box::new(app::RotazioniApp::new(data_dir)),
    })
}

/// Hide the status/navigation bars (immersive sticky) and keep the screen on
/// while the app is running. Every step is failure-tolerant (only a warning
/// is logged) so the app still runs if any call fails.
#[cfg(target_os = "android")]
fn set_fullscreen_and_keep_screen_on(app: &winit::platform::android::activity::AndroidApp) {
    use jni::jni_sig;
    use jni::jni_str;
    let vm = unsafe { jni::JavaVM::from_raw(app.vm_as_ptr().cast()) };
    let attach_result = vm.attach_current_thread(|env| -> jni::errors::Result<()> {
        // SAFETY: the activity global ref is owned by `app` and valid for the
        // duration of the call; cast it as a raw borrowed `JObject`.
        let raw_activity = app.activity_as_ptr() as jni::sys::jobject;
        let activity = unsafe { env.as_cast_raw::<jni::objects::JObject>(&raw_activity)? };

        // FLAG_KEEP_SCREEN_ON (0x80) | FLAG_FULLSCREEN (0x400)
        const WINDOW_FLAGS: i32 = 0x0000_0080 | 0x0000_0400;
        // SYSTEM_UI_FLAG_LAYOUT_STABLE | LAYOUT_HIDE_NAVIGATION |
        // LAYOUT_FULLSCREEN | HIDE_NAVIGATION | FULLSCREEN | IMMERSIVE_STICKY
        const UI_FLAGS: i32 = 0x100 | 0x200 | 0x400 | 0x2 | 0x4 | 0x1000;

        let window = env
            .call_method(
                &activity,
                jni_str!("getWindow"),
                jni_sig!(() -> android.view.Window),
                &[],
            )?
            .l()?;

        env.call_method(
            &window,
            jni_str!("addFlags"),
            jni_sig!((jint) -> void),
            &[WINDOW_FLAGS.into()],
        )?;

        let decor = env
            .call_method(
                &window,
                jni_str!("getDecorView"),
                jni_sig!(() -> android.view.View),
                &[],
            )?
            .l()?;
        env.call_method(
            &decor,
            jni_str!("setSystemUiVisibility"),
            jni_sig!((jint) -> void),
            &[UI_FLAGS.into()],
        )?;
        Ok(())
    });
    if let Err(err) = attach_result {
        log::warn!("fullscreen JNI setup failed: {err}");
    }
}

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
fn android_main(android_app: winit::platform::android::activity::AndroidApp) {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Info)
            .with_tag("rotazioni"),
    );
    log::info!("rotazioni android_main starting");
    set_fullscreen_and_keep_screen_on(&android_app);

    // App-private JSON store: /data/data/<pkg>/files on-device.
    let data_dir = android_app.internal_data_path();
    log::info!("data dir: {data_dir:?}");

    eframe::run_native(
        "rotazioni",
        eframe::NativeOptions {
            android_app: Some(android_app),
            renderer: eframe::Renderer::Glow,
            ..Default::default()
        },
        Box::new(move |cc| {
            setup_fonts(cc);
            Ok(wrapped_app(data_dir))
        }),
    )
    .expect("failed to run rotazioni");
}
