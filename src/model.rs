//! Pure volleyball rotation rules, ported literally from the React webapp
//! (`src/components/VolleyballCourt.tsx`). No GUI dependencies, fully
//! unit-testable. Court logical space: 900x450 (home = left half x in
//! 0..450, away = right half x in 450..900), y grows downward.

use serde::{Deserialize, Serialize};

/// Fixed roles in slot order (webapp: `['P','S1','C2','O','S2','C1']`).
pub const ROLES: [&str; 6] = ["P", "S1", "C2", "O", "S2", "C1"];

/// Home team base colour (#3498db) / away team (#e74c3c) as RGB triples.
pub const HOME_COLOR: (u8, u8, u8) = (0x34, 0x98, 0xdb);
pub const AWAY_COLOR: (u8, u8, u8) = (0xe7, 0x4c, 0x3c);

/// Zones that count as back row (webapp: `[1, 6, 5]`).
pub const BACK_ROW_ZONES: [u8; 3] = [1, 6, 5];

/// Base zone coordinates for the home (left) side, verbatim from the webapp.
pub const HOME_POSITIONS: [(u8, f32, f32); 6] = [
    (1, 150.0, 370.0),
    (2, 350.0, 370.0),
    (3, 350.0, 250.0),
    (4, 350.0, 100.0),
    (5, 150.0, 100.0),
    (6, 150.0, 250.0),
];

/// Base zone coordinates for the away (right) side, verbatim from the webapp.
pub const AWAY_POSITIONS: [(u8, f32, f32); 6] = [
    (1, 750.0, 100.0),
    (2, 550.0, 100.0),
    (3, 550.0, 250.0),
    (4, 550.0, 370.0),
    (5, 750.0, 370.0),
    (6, 750.0, 250.0),
];

/// Maximum length of a custom player name (webapp char limit).
pub const NAME_CHAR_LIMIT: usize = 15;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Team {
    Home,
    Away,
}

impl Team {
    pub fn base_positions(self) -> &'static [(u8, f32, f32); 6] {
        match self {
            Team::Home => &HOME_POSITIONS,
            Team::Away => &AWAY_POSITIONS,
        }
    }

    /// (x, y) of a zone in this team's base table (`zone` is 1-based).
    pub fn base_xy(self, zone: u8) -> Option<(f32, f32)> {
        self.base_positions()
            .iter()
            .find(|(z, _, _)| *z == zone)
            .map(|(_, x, y)| (*x, *y))
    }
}

/// One player on the court. Mirrors the webapp `PlayerData`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Player {
    /// 1..=6 home, 7..=12 away (webapp ids).
    pub id: u32,
    pub team: Team,
    pub zone: u8,
    pub x: f32,
    pub y: f32,
    /// Fixed role assigned by slot index; never rotated.
    pub role: String,
    /// Custom display name (max 15 chars), shown instead of the role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

impl Player {
    pub fn effective_display<'a>(&'a self, label: &'a str) -> &'a str {
        self.name.as_deref().filter(|n| !n.is_empty()).unwrap_or(label)
    }
}

/// Full on-court state for both teams plus the interaction modes.
#[derive(Debug, Clone, PartialEq)]
pub struct Court {
    pub players: Vec<Player>,
    pub libero_home: bool,
    pub libero_away: bool,
    pub under13: bool,
    pub tracking_mode: bool,
    /// Webapp `trackedAwayPlayer` (an away player id), toggled off on repeat.
    pub tracked_away: Option<u32>,
}

impl Default for Court {
    fn default() -> Self {
        Self::new()
    }
}

impl Court {
    /// Initial line-up, identical to the webapp `useState` initial value.
    pub fn new() -> Self {
        let mut players = Vec::with_capacity(12);
        for (i, (zone, x, y)) in HOME_POSITIONS.iter().enumerate() {
            players.push(Player {
                id: i as u32 + 1,
                team: Team::Home,
                zone: *zone,
                x: *x,
                y: *y,
                role: ROLES[i].to_owned(),
                name: None,
            });
        }
        for (i, (zone, x, y)) in AWAY_POSITIONS.iter().enumerate() {
            players.push(Player {
                id: i as u32 + 7,
                team: Team::Away,
                zone: *zone,
                x: *x,
                y: *y,
                role: ROLES[i].to_owned(),
                name: None,
            });
        }
        Self {
            players,
            libero_home: false,
            libero_away: false,
            under13: false,
            tracking_mode: false,
            tracked_away: None,
        }
    }

    pub fn players_of(&self, team: Team) -> impl Iterator<Item = &Player> {
        self.players.iter().filter(move |p| p.team == team)
    }

    pub fn players_of_mut(&mut self, team: Team) -> impl Iterator<Item = &mut Player> {
        self.players.iter_mut().filter(move |p| p.team == team)
    }

    pub fn player(&self, id: u32) -> Option<&Player> {
        self.players.iter().find(|p| p.id == id)
    }

    pub fn player_mut(&mut self, id: u32) -> Option<&mut Player> {
        self.players.iter_mut().find(|p| p.id == id)
    }

    /// Webapp `rotateTeam`: rotate the per-slot zone assignment of one team
    /// (last zone becomes first, every other slot takes the previous slot's
    /// zone) and snap x/y back to the base table for the new zone.
    /// Custom dragged positions are lost, exactly like the webapp.
    pub fn rotate_team(&mut self, team: Team) {
        // Collect indices of this team's players in slot order. The Vec was
        // built home-first then away, and per team the slot order is stable.
        let mut idx: Vec<usize> = self
            .players
            .iter()
            .enumerate()
            .filter(|(_, p)| p.team == team)
            .map(|(i, _)| i)
            .collect();
        if idx.len() < 2 {
            return;
        }
        // rotated[i].zone = rotated[i-1].zone; rotated[0].zone = lastZone.
        let zones: Vec<u8> = idx.iter().map(|&i| self.players[i].zone).collect();
        let last = *zones.last().expect("non-empty");
        let n = idx.len();
        for k in (1..n).rev() {
            let i = idx[k];
            self.players[i].zone = zones[k - 1];
        }
        let first = idx[0];
        self.players[first].zone = last;
        // Snap x/y from the base table.
        for &i in &idx {
            let zone = self.players[i].zone;
            if let Some((x, y)) = team.base_xy(zone) {
                self.players[i].x = x;
                self.players[i].y = y;
            }
        }
        idx.clear();
    }

    /// Webapp `rotateBothTeams`.
    pub fn rotate_both(&mut self) {
        self.rotate_team(Team::Home);
        self.rotate_team(Team::Away);
    }

    /// Webapp `handleDrag`: move a player, zone unchanged.
    pub fn drag(&mut self, id: u32, x: f32, y: f32) {
        if let Some(p) = self.player_mut(id) {
            p.x = x;
            p.y = y;
        }
    }

    /// Webapp `resetPositions`: only the HOME team snaps back to the base
    /// zone table (zones untouched); away players are not modified.
    pub fn reset_home_positions(&mut self) {
        for p in self.players_of_mut(Team::Home) {
            if let Some((x, y)) = Team::Home.base_xy(p.zone) {
                p.x = x;
                p.y = y;
            }
        }
    }

    /// Webapp `checkFalli`. Returns the ids of players in positional fault.
    /// The comparisons are ported literally, including the webapp's own
    /// quirks (do not "fix" them: behaviour must match).
    pub fn check_falli(&self) -> Vec<u32> {
        let mut falli = Vec::new();
        self.check_team_falli(Team::Home, true, &mut falli);
        self.check_team_falli(Team::Away, false, &mut falli);
        falli
    }

    fn by_zone(&self, team: Team, zone: u8) -> Option<&Player> {
        self.players_of(team).find(|p| p.zone == zone)
    }

    fn check_team_falli(&self, team: Team, is_left_field: bool, falli: &mut Vec<u32>) {
        let (Some(z1), Some(z2), Some(z3), Some(z4), Some(z5), Some(z6)) = (
            self.by_zone(team, 1),
            self.by_zone(team, 2),
            self.by_zone(team, 3),
            self.by_zone(team, 4),
            self.by_zone(team, 5),
            self.by_zone(team, 6),
        ) else {
            return;
        };

        if is_left_field {
            // CAMPO SINISTRO (0-450 x) — home team.
            if z1.x > z2.x {
                falli.push(z1.id);
            }
            if z1.y < z6.y {
                falli.push(z1.id);
            }
            if z2.x < z1.x {
                falli.push(z2.id);
            }
            if z2.y < z3.y {
                falli.push(z2.id);
            }
            if z3.x < z6.x {
                falli.push(z3.id);
            }
            if z3.y < z4.y {
                falli.push(z3.id);
            }
            if z3.y > z2.y {
                falli.push(z3.id);
            }
            if z4.x < z5.x {
                falli.push(z4.id);
            }
            if z4.y > z3.y {
                falli.push(z4.id);
            }
            if z5.y > z6.y {
                falli.push(z5.id);
            }
            if z5.x > z4.x {
                falli.push(z5.id);
            }
            if z6.y < z5.y {
                falli.push(z6.id);
            }
            if z6.x > z3.x {
                falli.push(z6.id);
            }
            if z6.y > z1.y || z6.y < z5.y {
                falli.push(z6.id);
            }
        } else {
            // CAMPO DESTRO (450-900 x) — away team.
            if z1.x < z2.x {
                falli.push(z1.id);
            }
            if z1.y > z6.y {
                falli.push(z1.id);
            }
            if z2.x < z3.x {
                falli.push(z2.id);
            }
            if z2.y > z5.y {
                falli.push(z2.id);
            }
            if z3.y > z6.y {
                falli.push(z3.id);
            }
            if z4.x > z5.x {
                falli.push(z4.id);
            }
            if z5.x < z6.x {
                falli.push(z5.id);
            }
        }
    }

    /// Webapp `convertRoleToDisplay`: Under-13 mapping first (it ignores the
    /// libero), otherwise Senior with the libero relabel for C1/C2 in the
    /// back row when that side's libero mode is on.
    pub fn role_label(&self, player_id: u32) -> String {
        let Some(player) = self.player(player_id) else {
            return String::new();
        };
        if !self.under13 {
            let is_back_row = BACK_ROW_ZONES.contains(&player.zone);
            let is_central = player.role == "C1" || player.role == "C2";
            match player.team {
                Team::Home if self.libero_home && is_back_row && is_central => {
                    return "L".to_owned();
                }
                Team::Away if self.libero_away && is_back_row && is_central => {
                    return "L".to_owned();
                }
                _ => {}
            }
            return player.role.clone();
        }

        // Under 13 mapping (verbatim from the webapp table).
        match player.role.as_str() {
            "P" => "P".to_owned(),
            "S1" => "Z4".to_owned(),
            "C2" => "Z2".to_owned(),
            "O" => "P".to_owned(),
            "S2" => "Z4".to_owned(),
            "C1" => "Z2".to_owned(),
            other => other.to_owned(),
        }
    }

    /// Webapp `handleAwayPlayerClick`: in tracking mode, tapping an away
    /// player tracks it; tapping the tracked one again untoggles.
    pub fn click_away_player(&mut self, id: u32) {
        if !self.tracking_mode {
            return;
        }
        if self.tracked_away == Some(id) {
            self.tracked_away = None;
        } else {
            self.tracked_away = Some(id);
        }
    }

    /// Webapp `toggleTrackingMode`: turning tracking off also clears the
    /// tracked player.
    pub fn toggle_tracking(&mut self) {
        self.tracking_mode = !self.tracking_mode;
        if !self.tracking_mode {
            self.tracked_away = None;
        }
    }

    /// A saved position inside a formation: matches the webapp export shape
    /// (`{zone, x, y, role, name}`).
    pub fn formation_positions(&self, team: Team) -> Vec<FormationPosition> {
        self.players_of(team)
            .map(|p| FormationPosition {
                zone: p.zone,
                x: p.x,
                y: p.y,
                role: p.role.clone(),
                name: p.name.clone(),
            })
            .collect()
    }

    /// Webapp `loadFormation`: players are matched by ROLE and take
    /// x/y/zone/name from the saved entry.
    pub fn apply_formation(&mut self, formation: &Formation) {
        for p in &mut self.players {
            let saved = match p.team {
                Team::Home => formation.home.iter().find(|sp| sp.role == p.role),
                Team::Away => formation.away.iter().find(|sp| sp.role == p.role),
            };
            if let Some(sp) = saved {
                p.x = sp.x;
                p.y = sp.y;
                p.zone = sp.zone;
                p.name = sp.name.clone();
            }
        }
    }
}

/// One position record inside a saved formation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FormationPosition {
    pub zone: u8,
    pub x: f32,
    pub y: f32,
    pub role: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// A saved formation (webapp `UnifiedFormation`, local-only here).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Formation {
    pub name: String,
    pub team_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "homePositions")]
    pub home: Vec<FormationPosition>,
    #[serde(rename = "awayPositions")]
    pub away: Vec<FormationPosition>,
}

/// A team as stored by the webapp (`{code, name}`, plus timestamps there;
/// we keep the minimal native shape requested).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TeamEntry {
    pub code: String,
    pub name: String,
}

/// Team code generator: 4 chars of name + 4 of millis, uppercase A-Z0-9,
/// mirroring the webapp `generateTeamCode` closely enough for local use.
pub fn generate_team_code(team_name: &str, millis: u64) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut raw: Vec<u8> = team_name
        .to_lowercase()
        .chars()
        .filter(|c| !c.is_whitespace())
        .map(|c| c as u8)
        .collect();
    // Emulate the webapp's base64 slices deterministically without pulling
    // in a base64 crate: fold the name bytes and the timestamp into 8
    // symbols drawn from A-Z0-9.
    let folded: u64 = raw
        .drain(..)
        .fold(0xcbf2_9ce4_8422_2325, |acc, b| {
            (acc ^ u64::from(b)).wrapping_mul(0x0000_0100_0000_01b3)
        });
    let mut code = String::with_capacity(8);
    let mut seed = folded ^ millis;
    for _ in 0..8 {
        code.push(ALPHABET[(seed % 36) as usize] as char);
        seed = seed / 36 + 0x9E37_79B9;
    }
    code
}

#[cfg(test)]
mod tests {
    use super::*;

    fn zones_of(court: &Court, team: Team) -> Vec<u8> {
        let mut v: Vec<(u32, u8)> = court.players_of(team).map(|p| (p.id, p.zone)).collect();
        v.sort_by_key(|(id, _)| *id);
        v.into_iter().map(|(_, z)| z).collect()
    }

    #[test]
    fn initial_layout_matches_webapp() {
        let court = Court::new();
        assert_eq!(court.players.len(), 12);
        let homes: Vec<&Player> = court.players_of(Team::Home).collect();
        let aways: Vec<&Player> = court.players_of(Team::Away).collect();
        assert_eq!(homes.len(), 6);
        assert_eq!(aways.len(), 6);
        // Roles in fixed slot order, ids 1..6 home / 7..12 away.
        for (i, p) in homes.iter().enumerate() {
            assert_eq!(p.id, i as u32 + 1);
            assert_eq!(p.role, ROLES[i]);
            assert_eq!(p.zone, HOME_POSITIONS[i].0);
            assert_eq!((p.x, p.y), (HOME_POSITIONS[i].1, HOME_POSITIONS[i].2));
        }
        assert_eq!(aways[0].id, 7);
        assert_eq!(aways[5].id, 12);
        // No faults in the base formation.
        assert!(court.check_falli().is_empty());
    }

    #[test]
    fn rotate_team_shifts_zones_and_snaps_xy() {
        let mut court = Court::new();
        // Base slots are [1,2,3,4,5,6]; after rotation slot0 takes the last
        // slot's zone (6) and every other slot moves one zone down.
        court.rotate_team(Team::Home);
        assert_eq!(zones_of(&court, Team::Home), vec![6, 1, 2, 3, 4, 5]);
        // x/y snapped to the base table of the NEW zone.
        let p0 = court.player(1).unwrap();
        assert_eq!((p0.x, p0.y), (150.0, 250.0)); // zone 6 home base
        let p5 = court.player(6).unwrap();
        assert_eq!((p5.x, p5.y), (150.0, 100.0)); // zone 5 home base
        // Away team untouched.
        assert_eq!(zones_of(&court, Team::Away), vec![1, 2, 3, 4, 5, 6]);
    }

    #[test]
    fn rotate_away_uses_away_base_table() {
        let mut court = Court::new();
        court.rotate_team(Team::Away);
        assert_eq!(zones_of(&court, Team::Away), vec![6, 1, 2, 3, 4, 5]);
        let p7 = court.player(7).unwrap(); // slot 0 -> zone 6
        assert_eq!((p7.x, p7.y), (750.0, 250.0)); // zone 6 away base
    }

    #[test]
    fn six_rotations_restore_initial_zones() {
        let mut court = Court::new();
        for _ in 0..6 {
            court.rotate_both();
        }
        assert_eq!(zones_of(&court, Team::Home), vec![1, 2, 3, 4, 5, 6]);
        assert_eq!(zones_of(&court, Team::Away), vec![1, 2, 3, 4, 5, 6]);
    }

    #[test]
    fn rotate_both_rotates_both_teams() {
        let mut court = Court::new();
        court.rotate_both();
        assert_eq!(zones_of(&court, Team::Home), vec![6, 1, 2, 3, 4, 5]);
        assert_eq!(zones_of(&court, Team::Away), vec![6, 1, 2, 3, 4, 5]);
    }

    #[test]
    fn rotate_after_drag_loses_custom_position_like_webapp() {
        let mut court = Court::new();
        court.drag(1, 200.0, 300.0);
        assert_eq!((court.player(1).unwrap().x, court.player(1).unwrap().y), (200.0, 300.0));
        court.rotate_team(Team::Home);
        let p = court.player(1).unwrap();
        assert_eq!(p.zone, 6);
        assert_eq!((p.x, p.y), (150.0, 250.0)); // snapped, drag forgotten
    }

    #[test]
    fn reset_only_repairs_home_positions() {
        let mut court = Court::new();
        court.drag(1, 111.0, 222.0); // home
        court.drag(7, 600.0, 60.0); // away
        court.reset_home_positions();
        let home = court.player(1).unwrap();
        assert_eq!((home.x, home.y), (150.0, 370.0));
        let away = court.player(7).unwrap();
        assert_eq!((away.x, away.y), (600.0, 60.0)); // untouched
    }

    #[test]
    fn falli_negative_both_sides_in_base() {
        // Base formation must be fault-free on BOTH sides.
        let court = Court::new();
        assert!(court.check_falli().is_empty());
    }

    #[test]
    fn falli_home_left_field_z1_right_of_z2() {
        // Left-field rule: zone1.x > zone2.x flags the zone-1 player.
        let mut court = Court::new();
        let z1_id = court.by_zone(Team::Home, 1).unwrap().id;
        let z2_id = court.by_zone(Team::Home, 2).unwrap().id;
        let z2x = court.player(z2_id).unwrap().x;
        court.drag(z1_id, z2x + 10.0, 370.0);
        let falli = court.check_falli();
        assert!(falli.contains(&z1_id));
    }

    #[test]
    fn falli_home_left_field_z5_above_z6() {
        // Left-field rule: zone5.y > zone6.y flags zone5 (y grows downward).
        let mut court = Court::new();
        let z5_id = court.by_zone(Team::Home, 5).unwrap().id;
        let z6_id = court.by_zone(Team::Home, 6).unwrap().id;
        let z6y = court.player(z6_id).unwrap().y;
        court.drag(z5_id, 150.0, z6y + 10.0);
        let falli = court.check_falli();
        assert!(falli.contains(&z5_id));
    }

    #[test]
    fn falli_away_right_field_z1_left_of_z2() {
        // Right-field rule: zone1.x < zone2.x flags the away zone-1 player.
        let mut court = Court::new();
        let z1_id = court.by_zone(Team::Away, 1).unwrap().id;
        let z2_id = court.by_zone(Team::Away, 2).unwrap().id;
        let z2x = court.player(z2_id).unwrap().x;
        court.drag(z1_id, z2x - 10.0, 100.0);
        let falli = court.check_falli();
        assert!(falli.contains(&z1_id));
    }

    #[test]
    fn falli_away_right_field_z4_right_of_z5() {
        // Right-field rule: zone4.x > zone5.x flags the away zone-4 player.
        let mut court = Court::new();
        let z4_id = court.by_zone(Team::Away, 4).unwrap().id;
        let z5_id = court.by_zone(Team::Away, 5).unwrap().id;
        let z5x = court.player(z5_id).unwrap().x;
        court.drag(z4_id, z5x + 10.0, 370.0);
        let falli = court.check_falli();
        assert!(falli.contains(&z4_id));
    }

    #[test]
    fn libero_label_only_for_central_back_row_when_enabled() {
        let mut court = Court::new();
        // Base: home slot5 = C1 in zone 6 (back row). Libero off -> "C1".
        let c1_id = court
            .players_of(Team::Home)
            .find(|p| p.role == "C1")
            .unwrap()
            .id;
        assert_eq!(court.role_label(c1_id), "C1");
        // Libero on -> "L".
        court.libero_home = true;
        assert_eq!(court.role_label(c1_id), "L");
        // Rotate until C1 reaches a front-row zone (2/3/4): back to "C1".
        for _ in 0..6 {
            court.rotate_team(Team::Home);
            let zone = court.player(c1_id).unwrap().zone;
            if !BACK_ROW_ZONES.contains(&zone) {
                assert_eq!(court.role_label(c1_id), "C1");
                return;
            }
        }
        panic!("C1 never left the back row in 6 rotations");
    }

    #[test]
    fn libero_never_flags_setter_or_outside_hitter() {
        let mut court = Court::new();
        court.libero_home = true;
        court.libero_away = true;
        // P (zone1, back row) keeps its role label.
        let p_id = court.players_of(Team::Home).find(|p| p.role == "P").unwrap().id;
        assert_eq!(court.role_label(p_id), "P");
        // S2 (zone5 away, back row) keeps its role label.
        let s2_id = court.players_of(Team::Away).find(|p| p.role == "S2").unwrap().id;
        assert_eq!(court.role_label(s2_id), "S2");
    }

    #[test]
    fn under13_maps_roles_and_overrides_libero() {
        let mut court = Court::new();
        court.under13 = true;
        court.libero_home = true; // must be ignored in Under 13 mode
        let labels: Vec<String> = court
            .players_of(Team::Home)
            .map(|p| court.role_label(p.id))
            .collect();
        assert_eq!(labels, vec!["P", "Z4", "Z2", "P", "Z4", "Z2"]);
        // Away follows the same table.
        let away_labels: Vec<String> = court
            .players_of(Team::Away)
            .map(|p| court.role_label(p.id))
            .collect();
        assert_eq!(away_labels, vec!["P", "Z4", "Z2", "P", "Z4", "Z2"]);
    }

    #[test]
    fn tracking_toggle_untoggles_and_disables_cleanly() {
        let mut court = Court::new();
        // No tracking while the mode is off.
        court.click_away_player(9);
        assert_eq!(court.tracked_away, None);
        court.toggle_tracking();
        court.click_away_player(9);
        assert_eq!(court.tracked_away, Some(9));
        // Same tap untoggles.
        court.click_away_player(9);
        assert_eq!(court.tracked_away, None);
        // Turning the mode off clears the tracked player.
        court.click_away_player(11);
        assert_eq!(court.tracked_away, Some(11));
        court.toggle_tracking();
        assert!(!court.tracking_mode);
        assert_eq!(court.tracked_away, None);
    }

    #[test]
    fn formation_roundtrip_matches_by_role() {
        let mut court = Court::new();
        // Customise the court: dragged players and a name.
        court.drag(1, 180.0, 320.0);
        court.drag(8, 700.0, 120.0);
        court.player_mut(1).unwrap().name = Some("Mario".to_owned());
        let formation = Formation {
            name: "Test".to_owned(),
            team_name: "Esempio".to_owned(),
            description: None,
            home: court.formation_positions(Team::Home),
            away: court.formation_positions(Team::Away),
        };
        assert_eq!(formation.home.len(), 6);
        assert_eq!(formation.away.len(), 6);

        // Rotate, wipe the custom name, then re-apply the formation.
        court.rotate_both();
        court.player_mut(1).unwrap().name = None;
        court.apply_formation(&formation);

        let p1 = court.player(1).unwrap();
        assert_eq!((p1.x, p1.y), (180.0, 320.0));
        assert_eq!(p1.zone, 1); // zone restored from the formation
        assert_eq!(p1.name.as_deref(), Some("Mario"));
        let p8 = court.player(8).unwrap();
        assert_eq!((p8.x, p8.y), (700.0, 120.0));
        assert_eq!(p8.zone, 2);
    }

    #[test]
    fn team_code_is_8_uppercase_alnum() {
        let code = generate_team_code("Pallavolo Test", 1_700_000_000_000);
        assert_eq!(code.len(), 8);
        assert!(code.chars().all(|c| c.is_ascii_alphanumeric() && !c.is_lowercase()));
    }
}
