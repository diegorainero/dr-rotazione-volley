//! Court and player rendering + touch interaction for the 900x450 logical
//! volleyball court. Pure egui painting helpers used by `app.rs`.

use eframe::egui::{self, Color32, FontId, Painter, Pos2, Rect, Sense, Stroke, Vec2};

use crate::model::{Court, Player, Team, AWAY_COLOR, HOME_COLOR};

/// Logical court size (matches the webapp's 900x450 stage).
pub const COURT_W: f32 = 900.0;
pub const COURT_H: f32 = 450.0;

/// Player circle radius in logical units (webapp: 30 * scale).
pub const PLAYER_R: f32 = 30.0;

const COURT_LEFT_BG: Color32 = Color32::from_rgb(0xEE, 0xEE, 0xEE);
const COURT_RIGHT_BG: Color32 = Color32::WHITE;
const COURT_LINE: Color32 = Color32::BLACK;
const GRID_LINE: Color32 = Color32::from_rgb(0x88, 0x88, 0x88);
const FIELD_GREEN: Color32 = Color32::from_rgb(0x2E, 0x7D, 0x32);
const FAULT_RED: Color32 = Color32::from_rgb(0xE5, 0x1E, 0x1E);
const TRACK_GOLD: Color32 = Color32::from_rgb(0xFF, 0xD7, 0x00);

/// Affine transform from logical court space to screen space.
#[derive(Clone, Copy)]
pub struct CourtTransform {
    pub origin: Pos2,
    pub scale: f32,
}

impl CourtTransform {
    /// Fit the whole logical court inside `rect`, centred.
    pub fn fit(rect: Rect) -> Self {
        let scale = (rect.width() / COURT_W).min(rect.height() / COURT_H);
        let w = COURT_W * scale;
        let h = COURT_H * scale;
        let origin = rect.center() - Vec2::new(w / 2.0, h / 2.0);
        Self { origin, scale }
    }

    pub fn court_rect(&self) -> Rect {
        Rect::from_min_size(
            self.origin,
            Vec2::new(COURT_W * self.scale, COURT_H * self.scale),
        )
    }

    pub fn to_screen(&self, x: f32, y: f32) -> Pos2 {
        self.origin + Vec2::new(x * self.scale, y * self.scale)
    }

    pub fn to_logical(&self, pos: Pos2) -> Option<(f32, f32)> {
        let local = (pos - self.origin) / self.scale;
        if local.x < 0.0 || local.x > COURT_W || local.y < 0.0 || local.y > COURT_H {
            return None;
        }
        Some((local.x, local.y))
    }
}

/// Result of one frame of court interaction.
pub struct CourtInteraction {
    pub dragged: Option<(u32, f32, f32)>,
    pub tapped: Option<u32>,
}

/// Paint the full court with its players inside `rect`; handle drag/tap.
/// `falli` are the ids currently in positional fault.
pub fn show_court(
    ui: &mut egui::Ui,
    rect: Rect,
    court: &Court,
    falli: &[u32],
) -> CourtInteraction {
    let t = CourtTransform::fit(rect);
    let painter = ui.painter_at(rect);

    paint_field(&painter, &t);

    let mut interaction = CourtInteraction {
        dragged: None,
        tapped: None,
    };

    for player in &court.players {
        paint_player(ui, &t, court, player, falli, &mut interaction);
    }

    interaction
}

/// Green surround, two court halves, net, dashed 3-metre lines and the
/// white zone numbers — mirroring the webapp Stage/Layer stack.
fn paint_field(painter: &Painter, t: &CourtTransform) {
    let court = t.court_rect();

    // Green outer zone visible around the court.
    let outer = court.expand(28.0 * t.scale.max(0.4));
    painter.rect_filled(outer, 8.0, FIELD_GREEN);

    // Home half (left) and away half (right).
    let left = Rect::from_min_size(
        court.min,
        Vec2::new(450.0 * t.scale, 450.0 * t.scale),
    );
    painter.rect_filled(left, 0.0, COURT_LEFT_BG);
    painter.rect_stroke(
        left,
        0.0,
        Stroke::new(2.0 * t.scale, COURT_LINE),
        egui::StrokeKind::Inside,
    );
    let right = Rect::from_min_size(
        t.to_screen(450.0, 0.0),
        Vec2::new(450.0 * t.scale, 450.0 * t.scale),
    );
    painter.rect_filled(right, 0.0, COURT_RIGHT_BG);
    painter.rect_stroke(
        right,
        0.0,
        Stroke::new(2.0 * t.scale, COURT_LINE),
        egui::StrokeKind::Inside,
    );

    // Net: thick line at x=450.
    painter.line_segment(
        [t.to_screen(450.0, 0.0), t.to_screen(450.0, 450.0)],
        Stroke::new(3.0 * t.scale, COURT_LINE),
    );

    // Dashed attack (3 m) lines at x=300 and x=600.
    for x in [300.0f32, 600.0f32] {
        let mut dash_y = 0.0f32;
        while dash_y < 450.0 {
            let seg_end = (dash_y + 8.0).min(450.0);
            painter.line_segment(
                [t.to_screen(x, dash_y), t.to_screen(x, seg_end)],
                Stroke::new(1.5 * t.scale, GRID_LINE),
            );
            dash_y += 16.0;
        }
    }

    // Zone numbers 1..6 on both halves (front row 4-3-2 at the net side,
    // back row 5-6-1 behind), matching the zone centres.
    let zone_centres_home = crate::model::HOME_POSITIONS;
    let zone_centres_away = crate::model::AWAY_POSITIONS;
    let font = FontId::proportional((26.0 * t.scale).clamp(10.0, 26.0));
    for (zone, x, y) in zone_centres_home.into_iter().chain(zone_centres_away) {
        painter.text(
            t.to_screen(x, y) + Vec2::new(0.0, -52.0 * t.scale),
            egui::Align2::CENTER_CENTER,
            zone.to_string(),
            font.clone(),
            Color32::from_black_alpha(90),
        );
    }
}

/// Which base team colour a player would take on the web before overrides.
fn team_color(team: Team) -> Color32 {
    match team {
        Team::Home => Color32::from_rgb(HOME_COLOR.0, HOME_COLOR.1, HOME_COLOR.2),
        Team::Away => Color32::from_rgb(AWAY_COLOR.0, AWAY_COLOR.1, AWAY_COLOR.2),
    }
}

fn paint_player(
    ui: &mut egui::Ui,
    t: &CourtTransform,
    court: &Court,
    player: &Player,
    falli: &[u32],
    interaction: &mut CourtInteraction,
) {
    let center = t.to_screen(player.x, player.y);
    let radius = (PLAYER_R * t.scale).max(14.0);

    // Generous touch target: at least 44 logical px diameter.
    let hit_radius = radius.max(24.0);
    let response = ui.interact(
        Rect::from_center_size(center, Vec2::splat(hit_radius * 2.0)),
        egui::Id::new(("player", player.id)),
        Sense::click_and_drag(),
    );

    if response.dragged() {
        if let Some(pos) = response.interact_pointer_pos() {
            if let Some((lx, ly)) = t.to_logical(pos) {
                interaction.dragged = Some((player.id, lx, ly));
            }
        }
    }
    if response.clicked() {
        interaction.tapped = Some(player.id);
    }

    // Colour precedence mirrors the webapp `getPlayerColor`: tracked gold >
    // fault red > team colour. While dragging preview the new position.
    let (draw_center, is_drag_preview) = if response.dragged() {
        if let Some((_, lx, ly)) = interaction.dragged {
            if lx.clamp(0.0, COURT_W) == lx && ly.clamp(0.0, COURT_H) == ly {
                // clamp into court space for the preview only
                let cx = lx.max(0.0).min(COURT_W);
                let cy = ly.max(0.0).min(COURT_H);
                (t.to_screen(cx, cy), true)
            } else {
                (center, false)
            }
        } else {
            (center, false)
        }
    } else {
        (center, false)
    };

    let mut fill = team_color(player.team);
    if falli.contains(&player.id) {
        fill = FAULT_RED;
    }
    if player.team == Team::Away && court.tracked_away == Some(player.id) {
        fill = TRACK_GOLD;
    }

    let painter = ui.painter();
    if response.hovered() || is_drag_preview {
        painter.circle_stroke(
            draw_center,
            radius + 4.0,
            Stroke::new(2.0, Color32::WHITE),
        );
    }
    painter.circle(draw_center, radius, fill, Stroke::new(2.0, Color32::BLACK));

    // Label: custom name when present (smaller + ellipsis feel), else the
    // role/under-13/libero label from the model.
    let label = court.role_label(player.id);
    let text = player.effective_display(&label);
    let has_name = player.name.as_deref().map(|n| !n.is_empty()).unwrap_or(false);
    let font_size = if has_name { 18.0 } else { 24.0 } * t.scale;
    let font_size = font_size.clamp(9.0, 26.0);
    let display: String = if has_name && text.chars().count() > 8 {
        let truncated: String = text.chars().take(7).collect();
        format!("{truncated}…")
    } else {
        text.to_owned()
    };
    // Tracked gold is light: use dark text for contrast, white elsewhere.
    let text_color = if fill == TRACK_GOLD {
        Color32::from_rgb(0x33, 0x33, 0x33)
    } else {
        Color32::WHITE
    };
    painter.text(
        draw_center,
        egui::Align2::CENTER_CENTER,
        display,
        FontId::proportional(font_size),
        text_color,
    );
}
