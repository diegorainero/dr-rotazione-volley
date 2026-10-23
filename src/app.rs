//! eframe application: native port of the "Rotazioni Volley" webapp.
//!
//! Layout (eframe 0.36 `App::logic`/`App::ui` split): a compact top panel
//! with the main actions (rotations, reset, toggles), a full-width court in
//! the central area, a status strip at the bottom with the fault indicator,
//! and modal egui windows for player names, teams and formations — the same
//! grouping the webapp uses, rebuilt touch-first (>= 44 logical px targets).

use std::path::PathBuf;
use std::time::{Duration, Instant};

use eframe::egui::{self, Align2, Color32, Vec2};

use crate::court::{self, COURT_H, COURT_W};
use crate::model::{generate_team_code, Court, Formation, Team, TeamEntry, NAME_CHAR_LIMIT};
use crate::storage::Store;

/// Touch target height for control buttons: 44 logical px for fingers.
/// Width is computed at runtime so two rows of six buttons fill the panel.
const BTN: Vec2 = Vec2::new(0.0, 44.0);
const FEEDBACK_SECS: Duration = Duration::from_secs(4);

pub struct RotazioniApp {
    court: Court,
    store: Store,
    teams: Vec<TeamEntry>,
    formations: Vec<Formation>,
    /// Currently active team, like the webapp `currentTeam`.
    current_team: Option<TeamEntry>,
    names_open: bool,
    teams_open: bool,
    formations_open: bool,
    save_open: bool,
    save_name: String,
    save_description: String,
    new_team_name: String,
    feedback: Option<(String, Instant)>,
    /// Formation index pending a delete confirmation.
    delete_pending: Option<usize>,
    input_tuned: bool,
}

impl RotazioniApp {
    pub fn new(data_dir: Option<PathBuf>) -> Self {
        let store = match data_dir {
            Some(dir) => Store::new(dir),
            None => Store::desktop_default(),
        };
        let settings = store.load_settings();
        let teams = store.load_teams();
        let formations = store.load_formations();
        let current_team = teams.first().cloned();
        let mut court = Court::new();
        court.under13 = settings.under13;
        Self {
            court,
            store,
            teams,
            formations,
            current_team,
            names_open: false,
            teams_open: false,
            formations_open: false,
            save_open: false,
            save_name: String::new(),
            save_description: String::new(),
            new_team_name: String::new(),
            feedback: None,
            delete_pending: None,
            input_tuned: false,
        }
    }

    /// Desktop / test constructor with the default `./rotazioni-data` store.
    pub fn new_desktop() -> Self {
        Self::new(None)
    }

    fn set_feedback(&mut self, msg: impl Into<String>) {
        self.feedback = Some((msg.into(), Instant::now()));
    }

    fn persist_teams(&self) {
        if let Err(e) = self.store.save_teams(&self.teams) {
            eprintln!("save teams failed: {e}");
        }
    }

    fn persist_formations(&self) {
        if let Err(e) = self.store.save_formations(&self.formations) {
            eprintln!("save formations failed: {e}");
        }
    }

    fn persist_under13(&self) {
        let _ = self.store.save_under13(self.court.under13);
    }

    fn team_label(&self) -> &str {
        self.current_team
            .as_ref()
            .map(|t| t.name.as_str())
            .unwrap_or("Senza squadra")
    }

    fn save_current_formation(&mut self) {
        let team_name = self.team_label().to_owned();
        let name = if self.save_name.trim().is_empty() {
            format!("Formazione {}", self.formations.len() + 1)
        } else {
            self.save_name.trim().to_owned()
        };
        let description = if self.save_description.trim().is_empty() {
            None
        } else {
            Some(self.save_description.trim().to_owned())
        };
        let formation = Formation {
            name: name.clone(),
            team_name: team_name.clone(),
            description,
            home: self.court.formation_positions(Team::Home),
            away: self.court.formation_positions(Team::Away),
        };
        self.formations.push(formation);
        self.persist_formations();
        self.save_name.clear();
        self.save_description.clear();
        self.save_open = false;
        self.set_feedback(format!("Formazione \"{name}\" salvata per {team_name}"));
    }

    fn create_team(&mut self) {
        let name = self.new_team_name.trim().to_owned();
        if name.is_empty() {
            return;
        }
        let millis = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let entry = TeamEntry {
            code: generate_team_code(&name, millis),
            name: name.clone(),
        };
        self.teams.push(entry.clone());
        self.persist_teams();
        self.current_team = Some(entry);
        self.new_team_name.clear();
        self.set_feedback(format!("Squadra \"{name}\" creata"));
    }

    // ------------------------------------------------------------------ UI

    fn top_bar(&mut self, ui: &mut egui::Ui) {
        let mut under13 = self.court.under13;
        // Two fixed rows of six buttons sized to fill the panel edge to edge:
        // every control is visible at once (no horizontal scrolling
        // mid-match) and the labels never clip at any screen width.
        let spacing = ui.spacing().item_spacing.x;
        let btn_w = ((ui.available_width() - 16.0 - spacing * 6.0) / 6.0).max(72.0);
        let btn = Vec2::new(btn_w, BTN.y);

        // Row 1 — rotations, reset, tracking, player names.
        ui.horizontal_wrapped(|ui| {
            if ui
                .add(egui::Button::new("⟳ Ruota Mia").min_size(btn))
                .clicked()
            {
                self.court.rotate_team(Team::Home);
            }
            if ui
                .add(egui::Button::new("⟳ Ruota Ospiti").min_size(btn))
                .clicked()
            {
                self.court.rotate_team(Team::Away);
            }
            if ui
                .add(egui::Button::new("⟳ Entrambe").min_size(btn))
                .clicked()
            {
                self.court.rotate_both();
            }
            if ui.add(egui::Button::new("↺ Reset").min_size(btn)).clicked() {
                self.court.reset_home_positions();
                self.set_feedback("Posizioni casa ripristinate");
            }
            if ui
                .add_sized(
                    btn,
                    egui::Button::selectable(self.court.tracking_mode, "🎯 Traccia"),
                )
                .clicked()
            {
                self.court.toggle_tracking();
            }
            if ui
                .add_sized(btn, egui::Button::selectable(self.names_open, "👥 Nomi"))
                .clicked()
            {
                self.names_open = !self.names_open;
            }
        });

        // Row 2 — libero, rules mode, teams and formations. In Under 13 mode
        // there is no libero, so those two buttons stay visible but disabled
        // to keep the grid stable.
        ui.horizontal_wrapped(|ui| {
            ui.add_enabled_ui(!under13, |ui| {
                if ui
                    .add_sized(
                        btn,
                        egui::Button::selectable(self.court.libero_home, "🟡 L Casa"),
                    )
                    .clicked()
                {
                    self.court.libero_home = !self.court.libero_home;
                }
                if ui
                    .add_sized(
                        btn,
                        egui::Button::selectable(self.court.libero_away, "🟡 L Ospiti"),
                    )
                    .clicked()
                {
                    self.court.libero_away = !self.court.libero_away;
                }
            });
            let mode_label = if under13 { "🟠 Under 13" } else { "🔵 Senior" };
            if ui
                .add_sized(btn, egui::Button::selectable(under13, mode_label))
                .clicked()
            {
                under13 = !under13;
                self.court.under13 = under13;
                self.persist_under13();
                self.set_feedback(if under13 {
                    "Modalità Under 13 (P, Z4, Z2)"
                } else {
                    "Modalità Senior (P, S1, C2, O, S2, C1, L)"
                });
            }
            if ui
                .add_sized(btn, egui::Button::selectable(self.teams_open, "🏐 Squadre"))
                .clicked()
            {
                self.teams_open = !self.teams_open;
            }
            if ui.add(egui::Button::new("💾 Salva").min_size(btn)).clicked() {
                self.save_open = true;
            }
            if ui
                .add_sized(
                    btn,
                    egui::Button::selectable(self.formations_open, "📂 Formazioni"),
                )
                .clicked()
            {
                self.formations_open = !self.formations_open;
            }
        });
    }

    fn status_strip(&mut self, ctx: &egui::Context, ui: &mut egui::Ui, falli: &[u32]) {
        ui.horizontal_wrapped(|ui| {
            if falli.is_empty() {
                ui.colored_label(
                    Color32::from_rgb(0x1B, 0x5E, 0x20),
                    "✅ Nessun fallo di posizione",
                );
            } else {
                ui.colored_label(
                    Color32::from_rgb(0xC6, 0x28, 0x28),
                    format!("⚠️ Fallo di posizione sui giocatori: {}", join_ids(falli)),
                );
            }
            if self.court.tracking_mode {
                let tracked_line = match self.court.tracked_away {
                    Some(id) => self
                        .court
                        .player(id)
                        .map(|p| format!("🎯 Tracciando {} (zona {})", p.role, p.zone)),
                    None => None,
                };
                let msg = tracked_line
                    .unwrap_or_else(|| "🎯 Tocca un giocatore avversario per seguirlo".to_owned());
                ui.colored_label(Color32::from_rgb(0x8A, 0x6D, 0x00), msg);
            }
            if let Some((msg, since)) = &self.feedback {
                if since.elapsed() < FEEDBACK_SECS {
                    let msg = msg.clone();
                    ui.colored_label(Color32::from_rgb(0x0D, 0x47, 0xA1), msg);
                    ctx.request_repaint_after(Duration::from_millis(500));
                } else {
                    self.feedback = None;
                }
            }
        });
    }

    fn names_window(&mut self, ctx: &egui::Context) {
        if !self.names_open {
            return;
        }
        let mut open = self.names_open;
        let mut close_clicked = false;
        let max_h = ctx.content_rect().height() * 0.85;
        egui::Window::new("👥 Nomi Giocatori")
            .open(&mut open)
            .anchor(Align2::CENTER_CENTER, [0.0, 0.0])
            .max_height(max_h)
            .vscroll(true)
            .collapsible(false)
            .show(ctx, |ui| {
                ui.label("Lascia vuoto per mostrare il ruolo (max 15 caratteri).");
                ui.add_space(8.0);
                for team in [Team::Home, Team::Away] {
                    let (title, color) = match team {
                        Team::Home => ("Squadra Mia (casa)", Color32::from_rgb(0x21, 0x60, 0x9C)),
                        Team::Away => ("Avversari (ospiti)", Color32::from_rgb(0xB0, 0x39, 0x2E)),
                    };
                    ui.colored_label(color, title);
                    // Snapshot of the ids + labels to avoid borrowing while editing.
                    let rows: Vec<(u32, String, u8)> = self
                        .court
                        .players_of(team)
                        .map(|p| (p.id, self.court.role_label(p.id), p.zone))
                        .collect();
                    egui::Grid::new(("names_grid", team as u8))
                        .num_columns(2)
                        .spacing([14.0, 8.0])
                        .show(ui, |ui| {
                            for (id, role_label, zone) in rows {
                                ui.label(format!("Zona {zone} · {role_label}"));
                                let mut buf = self
                                    .court
                                    .player(id)
                                    .and_then(|p| p.name.clone())
                                    .unwrap_or_default();
                                let edit = egui::TextEdit::singleline(&mut buf)
                                    .char_limit(NAME_CHAR_LIMIT)
                                    .desired_width(160.0)
                                    .min_size(Vec2::new(160.0, 36.0));
                                if ui.add(edit).changed() {
                                    let trimmed = buf.trim();
                                    let new_name = if trimmed.is_empty() {
                                        None
                                    } else {
                                        Some(trimmed.to_owned())
                                    };
                                    if let Some(p) = self.court.player_mut(id) {
                                        p.name = new_name;
                                    }
                                }
                                ui.end_row();
                            }
                        });
                    ui.add_space(10.0);
                }
                if ui
                    .add(egui::Button::new("Chiudi").min_size(BTN))
                    .clicked()
                {
                    close_clicked = true;
                }
            });
        self.names_open = open && !close_clicked;
    }

    fn teams_window(&mut self, ctx: &egui::Context) {
        if !self.teams_open {
            return;
        }
        let mut open = self.teams_open;
        let mut close_clicked = false;
        let max_h = ctx.content_rect().height() * 0.85;
        egui::Window::new("🏐 Squadre")
            .open(&mut open)
            .anchor(Align2::CENTER_CENTER, [0.0, 0.0])
            .max_height(max_h)
            .vscroll(true)
            .collapsible(false)
            .show(ctx, |ui| {
                ui.label(format!("Squadra attiva: {}", self.team_label()));
                ui.add_space(8.0);
                let mut activate: Option<TeamEntry> = None;
                let current_code = self.current_team.as_ref().map(|c| c.code.clone());
                for team in &self.teams {
                    let is_current = current_code.as_deref() == Some(team.code.as_str());
                    let label = format!("{} · {}", team.name, team.code);
                    if ui
                        .add_sized(BTN, egui::Button::selectable(is_current, label))
                        .clicked()
                        && !is_current
                    {
                        activate = Some(team.clone());
                    }
                }
                if let Some(team) = activate {
                    self.current_team = Some(team.clone());
                    self.set_feedback(format!("Squadra attiva: {}", team.name));
                }
                if self.teams.is_empty() {
                    ui.label("Nessuna squadra salvata. Creane una qui sotto.");
                }
                ui.separator();
                ui.label("Nuova squadra:");
                ui.horizontal(|ui| {
                    ui.add(
                        egui::TextEdit::singleline(&mut self.new_team_name)
                            .hint_text("Nome squadra")
                            .desired_width(200.0)
                            .min_size(Vec2::new(200.0, 36.0)),
                    );
                    if ui
                        .add(egui::Button::new("➕ Crea").min_size(BTN))
                        .clicked()
                    {
                        self.create_team();
                    }
                });
                ui.add_space(6.0);
                if ui
                    .add(egui::Button::new("Chiudi").min_size(BTN))
                    .clicked()
                {
                    close_clicked = true;
                }
            });
        self.teams_open = open && !close_clicked;
    }

    fn formations_window(&mut self, ctx: &egui::Context) {
        if !self.formations_open {
            return;
        }
        let mut open = self.formations_open;
        let mut close_clicked = false;
        let max_h = ctx.content_rect().height() * 0.85;
        let mut load_idx: Option<usize> = None;
        let mut delete_idx: Option<usize> = None;
        egui::Window::new("📂 Carica Formazione")
            .open(&mut open)
            .anchor(Align2::CENTER_CENTER, [0.0, 0.0])
            .max_height(max_h)
            .vscroll(true)
            .collapsible(false)
            .show(ctx, |ui| {
                if self.formations.is_empty() {
                    ui.label("Nessuna formazione salvata. Usa \"💾 Salva Formazione\".");
                }
                for (i, f) in self.formations.iter().enumerate() {
                    ui.group(|ui| {
                        ui.label(format!("{} — {}", f.name, f.team_name));
                        if let Some(desc) = &f.description {
                            ui.small(desc.clone());
                        }
                        ui.horizontal(|ui| {
                            if ui
                                .add(egui::Button::new("📥 Carica").min_size(BTN))
                                .clicked()
                            {
                                load_idx = Some(i);
                            }
                            if ui
                                .add(egui::Button::new("🗑 Elimina").min_size(BTN))
                                .clicked()
                            {
                                delete_idx = Some(i);
                            }
                        });
                    });
                }
                ui.add_space(6.0);
                if ui
                    .add(egui::Button::new("Chiudi").min_size(BTN))
                    .clicked()
                {
                    close_clicked = true;
                }
            });
        self.formations_open = open && !close_clicked;

        if let Some(i) = load_idx {
            if let Some(f) = self.formations.get(i).cloned() {
                self.court.apply_formation(&f);
                self.set_feedback(format!("Formazione \"{}\" caricata", f.name));
            }
        }
        if let Some(i) = delete_idx {
            self.delete_pending = Some(i);
        }
    }

    fn delete_confirm_window(&mut self, ctx: &egui::Context) {
        let Some(i) = self.delete_pending else { return };
        let Some(f) = self.formations.get(i).cloned() else {
            self.delete_pending = None;
            return;
        };
        let mut confirm = false;
        let mut cancel = false;
        egui::Window::new("Elimina formazione")
            .anchor(Align2::CENTER_CENTER, [0.0, 0.0])
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                ui.label(format!("Eliminare \"{}\"?", f.name));
                ui.add_space(8.0);
                ui.horizontal(|ui| {
                    if ui
                        .add(egui::Button::new("Elimina").min_size(BTN))
                        .clicked()
                    {
                        confirm = true;
                    }
                    if ui
                        .add(egui::Button::new("Annulla").min_size(BTN))
                        .clicked()
                    {
                        cancel = true;
                    }
                });
            });
        if confirm {
            self.formations.remove(i);
            self.persist_formations();
            self.set_feedback(format!("Formazione \"{}\" eliminata", f.name));
            self.delete_pending = None;
        } else if cancel {
            self.delete_pending = None;
        }
    }

    fn save_window(&mut self, ctx: &egui::Context) {
        if !self.save_open {
            return;
        }
        let mut open = self.save_open;
        let mut do_save = false;
        let mut cancel = false;
        let team_label = self.team_label().to_owned();
        egui::Window::new("💾 Salva Formazione")
            .open(&mut open)
            .anchor(Align2::CENTER_CENTER, [0.0, 0.0])
            .collapsible(false)
            .resizable(false)
            .show(ctx, |ui| {
                egui::Grid::new("save_grid")
                    .num_columns(2)
                    .spacing([12.0, 8.0])
                    .show(ui, |ui| {
                        ui.label("Squadra");
                        ui.label(&team_label);
                        ui.end_row();
                        ui.label("Nome");
                        ui.add(
                            egui::TextEdit::singleline(&mut self.save_name)
                                .hint_text("Formazione 1")
                                .desired_width(220.0)
                                .min_size(Vec2::new(220.0, 36.0)),
                        );
                        ui.end_row();
                        ui.label("Descrizione");
                        ui.add(
                            egui::TextEdit::singleline(&mut self.save_description)
                                .hint_text("opzionale")
                                .desired_width(220.0)
                                .min_size(Vec2::new(220.0, 36.0)),
                        );
                        ui.end_row();
                    });
                ui.add_space(10.0);
                ui.horizontal(|ui| {
                    if ui
                        .add(egui::Button::new("💾 Salva").min_size(BTN))
                        .clicked()
                    {
                        do_save = true;
                    }
                    if ui
                        .add(egui::Button::new("Annulla").min_size(BTN))
                        .clicked()
                    {
                        cancel = true;
                    }
                });
            });
        if do_save {
            self.save_current_formation();
        } else if cancel {
            self.save_open = false;
        } else {
            self.save_open = open;
        }
    }
}

fn join_ids(ids: &[u32]) -> String {
    ids.iter()
        .map(|i| i.to_string())
        .collect::<Vec<_>>()
        .join(", ")
}

impl eframe::App for RotazioniApp {
    /// Called once per frame before `ui`: the right place for global options.
    fn logic(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Old tablets: sloppy digitizers and low fps make the default click
        // thresholds (6 pt / 0.8 s) miss real taps. Relax once per session.
        if !self.input_tuned {
            ctx.options_mut(|o| {
                o.input_options.max_click_dist = 12.0;
                o.input_options.max_click_duration = 1.2;
            });
            for theme in [egui::Theme::Dark, egui::Theme::Light] {
                ctx.style_mut_of(theme, |style| {
                    for (_fam, font) in style.text_styles.iter_mut() {
                        font.size = (font.size * 1.15).max(13.0);
                    }
                });
            }
            self.input_tuned = true;
        }
    }

    /// Called each frame with a root `Ui` covering the whole window.
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::Panel::top("top_bar").show(ui, |ui| self.top_bar(ui));

        let falli = self.court.check_falli();
        let ctx = ui.ctx().clone();
        egui::Panel::bottom("status_bar").show(ui, |ui| {
            self.status_strip(&ctx, ui, &falli);
        });

        egui::CentralPanel::default().show(ui, |ui| {
            let rect = ui.available_rect_before_wrap();
            let interaction = court::show_court(ui, rect, &self.court, &falli);
            if let Some((id, x, y)) = interaction.dragged {
                // Clamp into the court, like konva's stage bounds on the web.
                self.court
                    .drag(id, x.clamp(0.0, COURT_W), y.clamp(0.0, COURT_H));
            }
            if let Some(id) = interaction.tapped {
                let is_away = self
                    .court
                    .player(id)
                    .map(|p| p.team == Team::Away)
                    .unwrap_or(false);
                if is_away {
                    self.court.click_away_player(id);
                }
            }
        });

        self.names_window(&ctx);
        self.teams_window(&ctx);
        self.formations_window(&ctx);
        self.delete_confirm_window(&ctx);
        self.save_window(&ctx);
    }
}
