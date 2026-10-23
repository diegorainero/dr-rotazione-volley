//! rotazioni: desktop entry point for development.

use eframe::egui::ViewportBuilder;
use rotazioni::{app::RotazioniApp, setup_fonts};

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: ViewportBuilder::default()
            .with_title("Rotazioni Volley")
            .with_inner_size([1280.0, 800.0]),
        ..Default::default()
    };
    eframe::run_native(
        "rotazioni",
        options,
        Box::new(|cc| {
            setup_fonts(cc);
            Ok(Box::new(RotazioniApp::new_desktop()))
        }),
    )
}
