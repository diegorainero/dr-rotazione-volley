//! JSON file persistence for teams, formations and app settings.
//!
//! Layout (per user decision, no SQLite):
//!   <data_dir>/teams.json       -> Vec<TeamEntry>
//!   <data_dir>/formations.json  -> Vec<Formation>
//!   <data_dir>/settings.json    -> Settings (under-13 mode, like the web's
//!                                  `volleyball-mode` localStorage entry)
//! On Android `data_dir` is the app-private files dir handed over by
//! `android_main` (via `AndroidApp::internal_data_path()`); on desktop it
//! falls back to `./rotazioni-data/`.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::model::{Formation, TeamEntry};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default)]
    pub under13: bool,
}

/// Root directory of the JSON store.
pub struct Store {
    dir: PathBuf,
}

impl Store {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    /// Desktop fallback: `./rotazioni-data/` under the working directory.
    pub fn desktop_default() -> Self {
        Self::new(PathBuf::from("./rotazioni-data"))
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    fn path(&self, file: &str) -> PathBuf {
        self.dir.join(file)
    }

    fn read<T: for<'de> Deserialize<'de>>(&self, file: &str) -> Option<T> {
        let path = self.path(file);
        let raw = fs::read_to_string(&path).ok()?;
        serde_json::from_str(&raw).ok()
    }

    fn write<T: Serialize>(&self, file: &str, value: &T) -> std::io::Result<()> {
        fs::create_dir_all(&self.dir)?;
        let path = self.path(file);
        let tmp = self.dir.join(format!("{file}.tmp"));
        let json = serde_json::to_string_pretty(value)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        fs::write(&tmp, json)?;
        fs::rename(&tmp, &path)?;
        Ok(())
    }

    pub fn load_teams(&self) -> Vec<TeamEntry> {
        self.read("teams.json").unwrap_or_default()
    }

    pub fn save_teams(&self, teams: &[TeamEntry]) -> std::io::Result<()> {
        self.write("teams.json", &teams)
    }

    pub fn load_formations(&self) -> Vec<Formation> {
        self.read("formations.json").unwrap_or_default()
    }

    pub fn save_formations(&self, formations: &[Formation]) -> std::io::Result<()> {
        self.write("formations.json", &formations)
    }

    pub fn load_settings(&self) -> Settings {
        self.read("settings.json").unwrap_or_default()
    }

    pub fn save_under13(&self, under13: bool) -> std::io::Result<()> {
        self.write("settings.json", &Settings { under13 })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Court, FormationPosition, Team};

    fn fresh_store(tag: &str) -> (Store, PathBuf) {
        let dir = std::env::temp_dir().join(format!(
            "rotazioni-store-test-{}-{}",
            tag,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        (Store::new(dir.clone()), dir)
    }

    #[test]
    fn empty_store_returns_defaults() {
        let (store, _dir) = fresh_store("empty");
        assert!(store.load_teams().is_empty());
        assert!(store.load_formations().is_empty());
        assert!(!store.load_settings().under13);
    }

    #[test]
    fn teams_json_roundtrip() {
        let (store, dir) = fresh_store("teams");
        let teams = vec![
            TeamEntry { code: "AAAA1111".into(), name: "Squadra Uno".into() },
            TeamEntry { code: "BBBB2222".into(), name: "Squadra Due".into() },
        ];
        store.save_teams(&teams).expect("save teams");
        assert!(dir.join("teams.json").exists());
        let loaded = store.load_teams();
        assert_eq!(loaded, teams);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn formations_json_roundtrip() {
        let (store, dir) = fresh_store("formations");
        let court = Court::new();
        let home: Vec<FormationPosition> = court.formation_positions(Team::Home);
        let away: Vec<FormationPosition> = court.formation_positions(Team::Away);
        let formations = vec![Formation {
            name: "Base".into(),
            team_name: "Test".into(),
            description: Some("4-2".into()),
            home,
            away,
        }];
        store.save_formations(&formations).expect("save formations");
        let loaded = store.load_formations();
        assert_eq!(loaded, formations);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn under13_setting_roundtrip() {
        let (store, dir) = fresh_store("settings");
        assert!(!store.load_settings().under13);
        store.save_under13(true).expect("save settings");
        assert!(store.load_settings().under13);
        store.save_under13(false).expect("save settings again");
        assert!(!store.load_settings().under13);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn corrupt_json_falls_back_to_default() {
        let (store, dir) = fresh_store("corrupt");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("teams.json"), "{ not valid json").unwrap();
        assert!(store.load_teams().is_empty());
        let _ = fs::remove_dir_all(&dir);
    }
}
