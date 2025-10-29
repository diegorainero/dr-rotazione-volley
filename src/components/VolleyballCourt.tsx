import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Player from './Player';
import {
  receivePositionsService,
  rotationsService,
  SavedReceivePosition,
  SavedRotation,
  db,
  resetDatabase,
} from '../db/database';
import { useResponsiveCanvas, useIsMobile } from '../hooks/useResponsiveCanvas';
import TeamManager from './TeamManager';
import { TeamCodeService, TeamData } from '../services/teamCodeService';
import DebugTeamLoading from './DebugTeamLoading';

interface PlayerData {
  id: number;
  x: number;
  y: number;
  zone: number;
  team: 'home' | 'away';
  color: string;
  role: string; // Il ruolo fisso del giocatore (P, S1, C2, O, S2, C1)
}

// posizioni iniziali per la tua squadra (a sinistra)
const homePositions = [
  { zone: 1, x: 150, y: 370 },
  { zone: 2, x: 350, y: 370 },
  { zone: 3, x: 350, y: 250 },
  { zone: 4, x: 350, y: 100 },
  { zone: 5, x: 150, y: 100 },
  { zone: 6, x: 150, y: 250 },
];

// posizioni avversari (campo di destra)
const awayPositions = [
  { zone: 1, x: 750, y: 100 },
  { zone: 2, x: 550, y: 100 },
  { zone: 3, x: 550, y: 250 },
  { zone: 4, x: 550, y: 370 },
  { zone: 5, x: 750, y: 370 },
  { zone: 6, x: 750, y: 250 },
];

const VolleyballCourt: React.FC = () => {
  // Carica la modalità salvata dal localStorage (default: false = Senior)
  const [isUnder13Mode, setIsUnder13Mode] = useState(() => {
    const saved = localStorage.getItem('volleyball-mode');
    return saved === 'under13';
  });
  const [showReceiveMode, setShowReceiveMode] = useState(false);
  const [savedPositions, setSavedPositions] = useState<SavedReceivePosition[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
  const [showLoadFormations, setShowLoadFormations] = useState(false);
  const [savedFormations, setSavedFormations] = useState<SavedRotation[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  // Stati per il Libero
  const [liberoModeHome, setLiberoModeHome] = useState(false);
  const [liberoModeAway, setLiberoModeAway] = useState(false);

  // Hook per responsive canvas
  const canvasSize = useResponsiveCanvas({
    baseWidth: 900,
    baseHeight: 450,
    maxWidth: 1200,
    minScale: 0.3,
    maxScale: 1.2,
  });
  const isMobile = useIsMobile();

  // Stati per gestione squadre
  const [currentTeam, setCurrentTeam] = useState<TeamData | null>(null);
  const [showTeamManager, setShowTeamManager] = useState(false);

  // Salva la modalità nel localStorage quando cambia
  useEffect(() => {
    localStorage.setItem(
      'volleyball-mode',
      isUnder13Mode ? 'under13' : 'senior'
    );
  }, [isUnder13Mode]);

  // Carica i dati salvati all'avvio
  useEffect(() => {
    loadSavedPositions();
    loadFormations();

    // 1. PRIMO: Controlla se c'è un team nell'URL (priorità massima)
    const urlTeamData = TeamCodeService.getTeamDataFromUrl();
    if (urlTeamData) {
      console.log("🔗 Team trovato nell'URL:", urlTeamData);
      setCurrentTeam(urlTeamData);
      // Pulisci URL per evitare loop
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // 2. SECONDO: Controlla codice team semplice nell'URL
    const urlTeamCode = TeamCodeService.getTeamCodeFromUrl();
    if (urlTeamCode) {
      console.log("🔗 Codice team trovato nell'URL:", urlTeamCode);
      const existingTeam = TeamCodeService.loadTeam(urlTeamCode);
      if (existingTeam) {
        console.log('✅ Team caricato da codice URL');
        setCurrentTeam(existingTeam);
        return;
      } else {
        console.log('❌ Team con codice non trovato localmente');
      }
    }

    // 3. TERZO: Carica team corrente se presente nel localStorage
    const team = TeamCodeService.getCurrentTeam();
    if (team) {
      console.log('📱 Team caricato dal localStorage:', team);
      setCurrentTeam(team);
    } else {
      // Se non c'è team corrente, mostra il manager
      console.log('👥 Nessun team trovato, mostra manager');
      setShowTeamManager(true);
    }
  }, []);

  const loadFormations = async () => {
    try {
      console.log('🔄 Caricamento formazioni...');

      // Debug del database
      const dbStatus = await db.open();
      console.log('🗄️ Database aperto:', dbStatus);
      const rotationsCount = await db.rotations.count();
      console.log('📊 Conteggio rotazioni nel DB:', rotationsCount);

      const formations = await rotationsService.getAll();
      const teams = await rotationsService.getAllTeamNames();

      console.log('📊 Formazioni caricate:', formations.length, formations);
      console.log('🏐 Squadre trovate:', teams.length, teams);

      setSavedFormations(formations);
      setTeamNames(teams);
    } catch (error) {
      console.error('❌ Errore nel caricamento delle formazioni:', error);

      // Controlla se è un errore di schema
      if (error instanceof Error && error.message.includes('is not indexed')) {
        console.log(
          '🔧 Rilevato errore di schema database. Tentativo di reset...'
        );

        const shouldReset = window.confirm(
          '⚠️ Errore del database rilevato.\n\n' +
            "Questo può accadere dopo aggiornamenti dell'app.\n" +
            'Vuoi resettare il database?\n\n' +
            '⚠️ ATTENZIONE: Tutti i dati salvati verranno persi!'
        );

        if (shouldReset) {
          try {
            await resetDatabase();
            alert(
              '✅ Database resettato con successo!\n\nOra puoi salvare nuove formazioni.'
            );
            // Riprova a caricare dopo il reset
            setSavedFormations([]);
            setTeamNames([]);
          } catch (resetError) {
            console.error('❌ Errore durante il reset:', resetError);
            alert(
              '❌ Errore durante il reset del database. Ricarica la pagina.'
            );
          }
        }
      } else {
        if (error instanceof Error) {
          console.error('❌ Stack trace:', error.stack);
        }
      }
    }
  };
  const loadSavedPositions = async () => {
    try {
      const positions = await receivePositionsService.getAll();
      setSavedPositions(positions);
    } catch (error) {
      console.error('Errore nel caricamento delle posizioni:', error);
    }
  };

  // Converte le etichette tra Senior e Under 13 + gestisce Libero
  const convertRoleToDisplay = (role: string, playerId: number): string => {
    if (!isUnder13Mode) {
      // Modalità Senior: gestisce il Libero
      const player = players.find((p) => p.id === playerId);
      if (!player) return role;

      // Determina se il giocatore è in seconda linea (zone 1, 6, 5)
      const isBackRow = [1, 6, 5].includes(player.zone);

      // Se è attiva la modalità Libero per questa squadra e il giocatore è C1/C2 in seconda linea
      if (
        player.team === 'home' &&
        liberoModeHome &&
        isBackRow &&
        (role === 'C1' || role === 'C2')
      ) {
        return 'L';
      }
      if (
        player.team === 'away' &&
        liberoModeAway &&
        isBackRow &&
        (role === 'C1' || role === 'C2')
      ) {
        return 'L';
      }

      return role; // Modalità Senior normale: P, S1, C2, O, S2, C1
    }

    // Modalità Under 13
    const under13Map: { [key: string]: string } = {
      P: 'P', // Palleggiatore rimane P
      S1: 'Z4', // Schiacciatore 1 → Z4
      C2: 'Z2', // Centrale 2 → Z2
      O: 'P', // Opposto → P (secondo palleggiatore)
      S2: 'Z4', // Schiacciatore 2 → Z4
      C1: 'Z2', // Centrale 1 → Z2
    };

    return under13Map[role] || role;
  };

  const [players, setPlayers] = useState<PlayerData[]>([
    ...homePositions.map((p, i) => {
      const roles = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];
      return {
        id: i + 1,
        team: 'home' as const,
        zone: p.zone,
        x: p.x,
        y: p.y,
        color: '#3498db',
        role: roles[i], // Assegna il ruolo fisso in base all'indice
      };
    }),
    ...awayPositions.map((p, i) => {
      const roles = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];
      return {
        id: i + 7,
        team: 'away' as const,
        zone: p.zone,
        x: p.x,
        y: p.y,
        color: '#e74c3c',
        role: roles[i], // Assegna il ruolo fisso in base all'indice
      };
    }),
  ]);

  // Ruota la squadra scelta
  const rotateTeam = (team: 'home' | 'away') => {
    setPlayers((prev) => {
      const teamPlayers = prev.filter((p) => p.team === team);
      const other = prev.filter((p) => p.team !== team);

      const rotated = teamPlayers.map((p) => ({ ...p }));
      const lastZone = rotated[rotated.length - 1].zone;
      for (let i = rotated.length - 1; i > 0; i--) {
        rotated[i].zone = rotated[i - 1].zone;
      }
      rotated[0].zone = lastZone;

      const base = team === 'home' ? homePositions : awayPositions;
      return [
        ...other,
        ...rotated.map((p) => {
          const newPos = base[p.zone - 1];
          return { ...p, x: newPos.x, y: newPos.y };
        }),
      ];
    });
  };

  // Ruota entrambe le squadre contemporaneamente
  const rotateBothTeams = () => {
    setPlayers((prev) => {
      const homePlayers = prev.filter((p) => p.team === 'home');
      const awayPlayers = prev.filter((p) => p.team === 'away');

      // Ruota squadra home
      const rotatedHome = homePlayers.map((p) => ({ ...p }));
      const lastZoneHome = rotatedHome[rotatedHome.length - 1].zone;
      for (let i = rotatedHome.length - 1; i > 0; i--) {
        rotatedHome[i].zone = rotatedHome[i - 1].zone;
      }
      rotatedHome[0].zone = lastZoneHome;

      // Ruota squadra away
      const rotatedAway = awayPlayers.map((p) => ({ ...p }));
      const lastZoneAway = rotatedAway[rotatedAway.length - 1].zone;
      for (let i = rotatedAway.length - 1; i > 0; i--) {
        rotatedAway[i].zone = rotatedAway[i - 1].zone;
      }
      rotatedAway[0].zone = lastZoneAway;

      // Applica le nuove posizioni
      return [
        ...rotatedHome.map((p) => {
          const newPos = homePositions[p.zone - 1];
          return { ...p, x: newPos.x, y: newPos.y };
        }),
        ...rotatedAway.map((p) => {
          const newPos = awayPositions[p.zone - 1];
          return { ...p, x: newPos.x, y: newPos.y };
        }),
      ];
    });
  };

  // Drag manuale
  const handleDrag = (id: number, pos: { x: number; y: number }) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x: pos.x, y: pos.y } : p))
    );
  };

  // Controllo falli di posizione per entrambe le squadre
  const checkFalli = () => {
    const home = players.filter((p) => p.team === 'home');
    const away = players.filter((p) => p.team === 'away');
    const falli: number[] = [];

    // Controlla falli per entrambe le squadre
    const checkTeamFalli = (team: PlayerData[], teamName: 'home' | 'away') => {
      // Determina se è campo sinistro (0-450) o destro (450-900)
      const isLeftField = teamName === 'home'; // assumiamo home sempre a sinistra

      // Trova i giocatori per zona
      const getPlayerByZone = (zone: number) =>
        team.find((p) => p.zone === zone);

      const zona1 = getPlayerByZone(1);
      const zona2 = getPlayerByZone(2);
      const zona3 = getPlayerByZone(3);
      const zona4 = getPlayerByZone(4);
      const zona5 = getPlayerByZone(5);
      const zona6 = getPlayerByZone(6);

      if (!zona1 || !zona2 || !zona3 || !zona4 || !zona5 || !zona6) return;

      if (isLeftField) {
        // CAMPO SINISTRO (0-450 x)

        // Zona 1 vs Zona 2: fallo se zona1.x > zona2.x
        if (zona1.x > zona2.x) {
          falli.push(zona1.id);
        }

        // Zona 1 vs Zona 6: fallo se zona1.y < zona6.y
        if (zona1.y < zona6.y) {
          falli.push(zona1.id);
        }

        // Zona 2 vs Zona 3: fallo se zona2.x < zona1.x
        if (zona2.x < zona1.x) {
          falli.push(zona2.id);
        }

        // Zona 2 vs Zona 5: fallo se zona2.y < zona3.y
        if (zona2.y < zona3.y) {
          falli.push(zona2.id);
        }

        // Zona 3 vs Zona 6: fallo se zona3.x < zona6.x
        if (zona3.x < zona6.x) {
          falli.push(zona3.id);
        }

        if (zona3.y < zona4.y) {
          falli.push(zona3.id);
        }

        if (zona3.y > zona2.y) {
          falli.push(zona3.id);
        }

        // Zona 4 vs Zona 5: fallo se zona4.x > zona5.x
        if (zona4.x < zona5.x) {
          falli.push(zona4.id);
        }
        // Zona 4 vs Zona 3: fallo se zona4.x > zona3.x
        if (zona4.y > zona3.y) {
          falli.push(zona4.id);
        }

        // Zona 5 vs Zona 6: fallo se zona5.y > zona6.y
        if (zona5.y > zona6.y) {
          falli.push(zona5.id);
        }

        // Zona 5 vs Zona 4: fallo se zona5.x > zona4.x
        if (zona5.x > zona4.x) {
          falli.push(zona5.id);
        }

        // Zona 6 vs Zona 5: fallo se zona6.y < zona5.y
        if (zona6.y < zona5.y) {
          falli.push(zona6.id);
        }
        // Zona 6 vs Zona 3: fallo se zona6.x > zona3.x
        if (zona6.x > zona3.x) {
          falli.push(zona6.id);
        }
        // Zona 6 vs Zona 1 and 5: fallo se zona6.y > zona1.y or zona6.y < zona5.y
        if (zona6.y > zona1.y || zona6.y < zona5.y) {
          falli.push(zona6.id);
        }
      } else {
        // CAMPO DESTRO (450-900 x)

        // Zona 1 vs Zona 2: fallo se zona1.x < zona2.x
        if (zona1.x < zona2.x) {
          falli.push(zona1.id);
        }

        // Zona 1 vs Zona 6: fallo se zona1.y > zona6.y
        if (zona1.y > zona6.y) {
          falli.push(zona1.id);
        }

        // Zona 2 vs Zona 3: fallo se zona2.x < zona3.x
        if (zona2.x < zona3.x) {
          falli.push(zona2.id);
        }

        // Zona 2 vs Zona 5: fallo se zona2.y > zona5.y
        if (zona2.y > zona5.y) {
          falli.push(zona2.id);
        }

        // Zona 3 vs Zona 6: fallo se zona3.y > zona6.y
        if (zona3.y > zona6.y) {
          falli.push(zona3.id);
        }

        // Zona 4 vs Zona 5: fallo se zona4.x < zona5.x
        if (zona4.x > zona5.x) {
          falli.push(zona4.id);
        }

        // Zona 5 vs Zona 6: fallo se zona5.x < zona6.x
        if (zona5.x < zona6.x) {
          falli.push(zona5.id);
        }
      }
    };

    // Controlla falli per entrambe le squadre
    checkTeamFalli(home, 'home');
    checkTeamFalli(away, 'away');

    return falli;
  };

  const falli = checkFalli();

  // Reset le posizioni della squadra home alle posizioni iniziali di zona
  const resetPositions = () => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.team === 'home') {
          const newPos = homePositions[p.zone - 1];
          return { ...p, x: newPos.x, y: newPos.y };
        }
        return p;
      })
    );
    setFeedback('🔄 Posizioni resettate');
    setTimeout(() => setFeedback(''), 2000);
    console.log('🔄 Posizioni resettatee alle posizioni iniziali');
  };

  // Funzione per formattare le chiavi di rotazione in modo leggibile
  const formatRotationKeyForDisplay = (rotationKey: string): string => {
    if (rotationKey.startsWith('U13-')) {
      return rotationKey
        .replace('U13-', 'Under 13: ')
        .replace(/:Z/g, ' in zona ')
        .replace(/-/g, ', ');
    } else if (rotationKey.startsWith('SR-')) {
      let formatted = rotationKey
        .replace('SR-', 'Senior: ')
        .replace('-LIB', ' (con Libero)')
        .replace(/:Z/g, ' in zona ')
        .replace(/-/g, ', ');
      return formatted.replace(', (con Libero)', ' (con Libero)');
    }
    // Fallback per vecchie chiavi senza prefisso
    return rotationKey
      .split('-')
      .map((part) => part.split(':')[0])
      .join(', ');
  };

  // Funzioni per gestire il Libero
  const toggleLiberoHome = () => {
    setLiberoModeHome(!liberoModeHome);
    setFeedback(
      liberoModeHome
        ? '👤 Libero disattivato (Casa)'
        : '🟡 Libero attivato (Casa)'
    );
    setTimeout(() => setFeedback(''), 2000);
  };

  const toggleLiberoAway = () => {
    setLiberoModeAway(!liberoModeAway);
    setFeedback(
      liberoModeAway
        ? '👤 Libero disattivato (Ospiti)'
        : '🟡 Libero attivato (Ospiti)'
    );
    setTimeout(() => setFeedback(''), 2000);
  };

  // Gestore selezione team
  const handleTeamSelected = (team: TeamData | null) => {
    setCurrentTeam(team);
    setShowTeamManager(false);

    if (team) {
      console.log(`✅ Squadra selezionata: ${team.name} (${team.code})`);
      // Ricarica dati specifici del team se necessario
      loadSavedPositions();
      loadFormations();
    }
  };

  // Salva la posizione di ricezione corrente
  const saveReceivePositions = async () => {
    try {
      setLoading(true);
      const homeTeam = players.filter((p) => p.team === 'home');
      const currentRotation = getCurrentRotationKey(homeTeam);

      const positions = homeTeam.map((p) => ({ x: p.x, y: p.y }));

      await receivePositionsService.save(currentRotation, positions);
      await loadSavedPositions(); // Ricarica la lista

      const modeText = isUnder13Mode ? 'Under 13' : 'Senior';
      const liberoText =
        !isUnder13Mode && liberoModeHome ? ' (con Libero)' : '';
      setFeedback(`💾 Ricezione salvata (${modeText}${liberoText})`);
      setTimeout(() => setFeedback(''), 2500);
      console.log('✅ Posizione di ricezione salvata per:', currentRotation);
    } catch (error) {
      console.error('Errore nel salvare le posizioni:', error);
      setFeedback('❌ Errore salvataggio');
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Genera una chiave per identificare la rotazione corrente (include modalità e stato Libero)
  const getCurrentRotationKey = (homeTeam: PlayerData[]): string => {
    // Ordina i giocatori per ID e prendi le loro zone per creare una chiave unica
    const sortedByZone = [...homeTeam].sort((a, b) => a.zone - b.zone);

    // Crea la chiave base con ruoli e zone
    const baseKey = sortedByZone
      .map((p) => {
        // In modalità Senior, considera anche se il Libero è attivo per questo ruolo/zona
        let displayRole = p.role;
        if (!isUnder13Mode && liberoModeHome) {
          const isBackRow = [1, 6, 5].includes(p.zone);
          if (isBackRow && (p.role === 'C1' || p.role === 'C2')) {
            displayRole = 'L';
          }
        }
        return `${displayRole}:Z${p.zone}`;
      })
      .join('-');

    // Aggiunge prefisso per modalità e stato Libero
    const modePrefix = isUnder13Mode ? 'U13' : 'SR';
    const liberoSuffix = !isUnder13Mode && liberoModeHome ? '-LIB' : '';

    return `${modePrefix}-${baseKey}${liberoSuffix}`;
  };

  // Applica le posizioni di ricezione salvate per la rotazione corrente
  const applyReceivePositions = async () => {
    try {
      setLoading(true);
      const homeTeam = players.filter((p) => p.team === 'home');
      const currentRotation = getCurrentRotationKey(homeTeam);

      const savedPositions = await receivePositionsService.load(
        currentRotation
      );

      if (savedPositions) {
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.team === 'home') {
              const index = homeTeam.findIndex((h) => h.id === p.id);
              const savedPos = savedPositions[index];
              return savedPos ? { ...p, x: savedPos.x, y: savedPos.y } : p;
            }
            return p;
          })
        );
        const modeText = isUnder13Mode ? 'Under 13' : 'Senior';
        const liberoText =
          !isUnder13Mode && liberoModeHome ? ' (con Libero)' : '';
        setFeedback(`📍 Ricezione caricata (${modeText}${liberoText})`);
        setTimeout(() => setFeedback(''), 2500);
        console.log(
          '✅ Posizioni di ricezione applicate per:',
          currentRotation
        );
      } else {
        const modeText = isUnder13Mode ? 'Under 13' : 'Senior';
        const liberoText =
          !isUnder13Mode && liberoModeHome ? ' (con Libero)' : '';
        setFeedback(`⚠️ Nessuna ricezione per ${modeText}${liberoText}`);
        setTimeout(() => setFeedback(''), 2500);
        console.log(
          '⚠️ Nessuna posizione salvata per rotazione:',
          currentRotation
        );
      }
    } catch (error) {
      console.error('Errore nel caricare le posizioni:', error);
      setFeedback('❌ Errore caricamento');
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Pulisce tutte le posizioni salvate
  const clearAllPositions = async () => {
    if (
      window.confirm(
        'Sei sicuro di voler eliminare tutte le posizioni salvate?'
      )
    ) {
      try {
        setLoading(true);
        await receivePositionsService.clear();
        await loadSavedPositions();
        alert('Tutte le posizioni sono state eliminate');
      } catch (error) {
        console.error("Errore nell'eliminazione:", error);
        alert("Errore nell'eliminazione delle posizioni");
      } finally {
        setLoading(false);
      }
    }
  };

  // Esporta le posizioni in formato JSON
  const exportPositions = async () => {
    try {
      const positions = await receivePositionsService.getAll();
      const dataStr = JSON.stringify(positions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `volley-positions-${
        new Date().toISOString().split('T')[0]
      }.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Errore nell'esportazione:", error);
      alert("Errore nell'esportazione");
    }
  };

  // Importa posizioni da file JSON
  const importPositions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const content = e.target?.result as string;
        const importedPositions = JSON.parse(content) as SavedReceivePosition[];

        // Valida la struttura dei dati
        if (!Array.isArray(importedPositions)) {
          throw new Error('Formato file non valido');
        }

        // Conferma prima dell'importazione
        const shouldReplace = window.confirm(
          `Trovate ${importedPositions.length} posizioni nel file.\n` +
            'Vuoi sostituire tutte le posizioni esistenti? (Sì = sostituisci, No = aggiungi)'
        );

        if (shouldReplace) {
          await receivePositionsService.clear();
        }

        // Importa le posizioni
        for (const position of importedPositions) {
          await receivePositionsService.save(
            position.rotationKey,
            position.positions
          );
        }

        await loadSavedPositions();
        alert(`${importedPositions.length} posizioni importate con successo!`);

        // Reset del file input
        event.target.value = '';
      } catch (error) {
        console.error("Errore nell'importazione:", error);
        alert(
          "Errore nell'importazione del file. Verifica che sia un file JSON valido."
        );
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Apre il dialog di selezione file
  const triggerImport = () => {
    const input = document.getElementById('file-import') as HTMLInputElement;
    input?.click();
  };

  // Salva la formazione corrente completa
  const saveCurrentFormation = async () => {
    const teamName = prompt('Nome della squadra:');
    if (!teamName?.trim()) {
      alert('Nome squadra richiesto per salvare la formazione');
      return;
    }

    const description =
      prompt('Descrizione opzionale (es. "4-2 con opposto in 4"):') || '';

    try {
      setLoading(true);
      const homeTeam = players.filter((p) => p.team === 'home');
      const awayTeam = players.filter((p) => p.team === 'away');

      // Genera automaticamente un nome basato su timestamp e squadra
      const timestamp = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const autoName = `${teamName}_${timestamp.replace(/[/,:]/g, '-')}`;

      console.log('💾 Salvando formazione:', {
        name: autoName,
        teamName,
        description,
      });
      console.log('🏠 Squadra home:', homeTeam);
      console.log('👥 Squadra away:', awayTeam);

      await rotationsService.save(
        autoName,
        teamName,
        homeTeam.map((p) => ({ zone: p.zone, x: p.x, y: p.y, role: p.role })),
        awayTeam.map((p) => ({ zone: p.zone, x: p.x, y: p.y, role: p.role })),
        description || undefined
      );

      console.log('✅ Formazione salvata, ricarico lista...');
      await loadFormations(); // Ricarica le formazioni

      alert(
        `✅ Formazione salvata per "${teamName}"!\n\n` +
          `Nome: ${autoName}\n` +
          `Descrizione: ${description || 'Nessuna'}\n\n` +
          `Usa il pulsante "📂 Carica Formazione" per vederla e caricarla.`
      );

      // Apri automaticamente il pannello di caricamento per mostrare la formazione appena salvata
      setShowLoadFormations(true);
    } catch (error) {
      console.error('Errore nel salvare la formazione:', error);
      alert('❌ Errore nel salvare la formazione');
    } finally {
      setLoading(false);
    }
  };

  // Carica una formazione specifica
  const loadFormation = async (formationId: number) => {
    try {
      setLoading(true);
      const formation = await rotationsService.load(formationId);

      if (formation) {
        // Applica le posizioni della formazione ai giocatori
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.team === 'home') {
              const savedPlayer = formation.homePositions.find(
                (sp) => sp.role === p.role
              );
              return savedPlayer
                ? {
                    ...p,
                    x: savedPlayer.x,
                    y: savedPlayer.y,
                    zone: savedPlayer.zone,
                  }
                : p;
            } else {
              const savedPlayer = formation.awayPositions.find(
                (sp) => sp.role === p.role
              );
              return savedPlayer
                ? {
                    ...p,
                    x: savedPlayer.x,
                    y: savedPlayer.y,
                    zone: savedPlayer.zone,
                  }
                : p;
            }
          })
        );
        alert(
          `✅ Formazione "${formation.name}" caricata con successo!\n\nLa squadra "${formation.teamName}" è ora posizionata sul campo.`
        );
      }
    } catch (error) {
      console.error('Errore nel caricare la formazione:', error);
      alert('❌ Errore nel caricare la formazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  // Elimina una formazione
  const deleteFormation = async (
    formationId: number,
    formationName: string
  ) => {
    if (
      window.confirm(
        `Sei sicuro di voler eliminare la formazione "${formationName}"?`
      )
    ) {
      try {
        setLoading(true);
        await rotationsService.delete(formationId);
        await loadFormations();
        alert(`✅ Formazione "${formationName}" eliminata con successo!`);
      } catch (error) {
        console.error("Errore nell'eliminazione:", error);
        alert("❌ Errore nell'eliminazione della formazione. Riprova.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className='flex flex-col h-screen'>
      {/* HEADER COMPATTO CON TUTTI I CONTROLLI - OTTIMIZZATO MOBILE */}
      <div className='bg-gray-800 text-white p-3 shadow-lg'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex items-center justify-between mb-3'>
            <h1 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
              🏐 Rotazioni Volley{' '}
              {isMobile && canvasSize.scale < 0.7 ? '(Mobile)' : ''}
            </h1>
            <div className='flex items-center gap-2'>
              <TeamManager
                currentTeam={currentTeam}
                onTeamSelected={handleTeamSelected}
              />
              <button
                onClick={() => setShowTeamManager(true)}
                className='bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 text-xs rounded'
                title='Gestisci squadre'
              >
                👥 Team
              </button>
            </div>
          </div>

          {/* Riga 1: Gestione Formazioni e Modalità */}
          <div
            className={`flex gap-2 mb-2 flex-wrap justify-center ${
              isMobile ? 'gap-1' : ''
            }`}
          >
            <button
              onClick={saveCurrentFormation}
              disabled={loading}
              className={`bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors ${
                isMobile ? 'min-h-[40px] text-xs' : ''
              }`}
              title='Salva la formazione corrente (richiede solo squadra e descrizione)'
            >
              💾 {isMobile ? 'Salva' : 'Salva Formazione'}
            </button>
            <button
              onClick={() => setShowLoadFormations(!showLoadFormations)}
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors ${
                isMobile ? 'min-h-[40px] text-xs' : ''
              }`}
            >
              📂 {isMobile ? 'Carica' : 'Carica Formazione'}
            </button>
            <button
              onClick={() => setShowFormations(!showFormations)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showFormations
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {showFormations
                ? '📋 Nascondi Gestione'
                : '📋 Gestisci Formazioni'}
            </button>

            <div className='border-l border-gray-600 mx-1'></div>

            <button
              onClick={() => {
                const newMode = !isUnder13Mode;
                setIsUnder13Mode(newMode);
                // Piccolo feedback per l'utente
                const modeName = newMode ? 'Under 13' : 'Senior';
                console.log(
                  `✅ Modalità ${modeName} salvata per le prossime sessioni`
                );
              }}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                isMobile ? 'min-h-[40px]' : ''
              } ${
                isUnder13Mode
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
                  : 'bg-gray-600 hover:bg-gray-500 text-white shadow-md'
              }`}
              title={`Cambia modalità ${
                isUnder13Mode ? 'a Senior' : 'a Under 13'
              } (salvata automaticamente)`}
            >
              {isUnder13Mode ? '🟠 Under 13' : '🔵 Senior'}
            </button>
            {!isMobile && (
              <span className='text-xs text-gray-300 flex items-center'>
                {isUnder13Mode ? '(P, Z4, Z2)' : '(P, S1, C2, O, S2, C1, L)'}
              </span>
            )}
          </div>

          {/* Riga 2: Ricezione e Utilities */}
          <div className='flex gap-2 mb-2 flex-wrap justify-center'>
            <button
              onClick={saveReceivePositions}
              disabled={loading}
              className='bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors'
              title='Salva la posizione di ricezione corrente'
            >
              💾 Salva Ricezione
            </button>
            <button
              onClick={applyReceivePositions}
              disabled={loading}
              className='bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors'
              title='Carica la ricezione salvata per questa rotazione (silenzioso)'
            >
              📍 Carica Ricezione
            </button>
            <button
              onClick={resetPositions}
              className='bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs rounded transition-colors'
              title='Reset posizioni alla formazione base'
            >
              🔄 Reset Posizioni
            </button>
            <button
              onClick={() => setShowReceiveMode(!showReceiveMode)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showReceiveMode
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {showReceiveMode ? '👁️ Nascondi Info' : '👁️ Info Ricezione'}
            </button>

            <div className='border-l border-gray-600 mx-1'></div>

            <button
              onClick={exportPositions}
              disabled={loading}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors'
            >
              � Esporta
            </button>
            <button
              onClick={triggerImport}
              disabled={loading}
              className='bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors'
            >
              📥 Importa
            </button>
            <button
              onClick={clearAllPositions}
              disabled={loading}
              className='bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded disabled:opacity-50 transition-colors'
            >
              🗑️ Pulisci Tutto
            </button>

            <div className='border-l border-gray-600 mx-1'></div>

            <button
              onClick={() => {
                console.log('🔍 Debug - Formazioni correnti:', savedFormations);
                console.log('🔍 Debug - Squadre correnti:', teamNames);
                loadFormations();
              }}
              className='bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-xs rounded transition-colors'
            >
              🔍 Debug
            </button>
            <button
              onClick={async () => {
                const shouldReset = window.confirm(
                  '⚠️ RESET DATABASE\n\n' +
                    'Questo cancellerà TUTTI i dati salvati:\n' +
                    '• Formazioni\n' +
                    '• Posizioni di ricezione\n\n' +
                    'Sei sicuro di voler continuare?'
                );

                if (shouldReset) {
                  try {
                    await resetDatabase();
                    setSavedFormations([]);
                    setTeamNames([]);
                    setSavedPositions([]);
                    alert('✅ Database resettato con successo!');
                  } catch (error) {
                    console.error('❌ Errore durante il reset:', error);
                    alert('❌ Errore durante il reset del database');
                  }
                }
              }}
              className='bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded transition-colors'
              title='Reset completo del database (cancella tutti i dati)'
            >
              🔄 Reset DB
            </button>
          </div>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      <div className='flex-1 flex flex-col items-center space-y-4 p-4 bg-gray-50'>
        {/* Input file nascosto per l'importazione */}
        <input
          id='file-import'
          type='file'
          accept='.json'
          onChange={importPositions}
          style={{ display: 'none' }}
        />

        {/* CAMPO DA GIOCO CON PULSANTI LIBERO */}
        <div className='relative'>
          {/* Pulsanti Libero - Solo in modalità Senior */}
          {!isUnder13Mode && (
            <>
              {/* Pulsanti Libero ottimizzati per mobile */}
              <button
                onClick={toggleLiberoHome}
                className={`absolute ${
                  isMobile
                    ? 'left-1 top-2'
                    : 'left-2 top-1/2 transform -translate-y-1/2'
                } px-2 py-1 text-xs rounded-lg font-medium transition-all z-10 ${
                  liberoModeHome
                    ? 'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isMobile ? 'min-h-[36px] text-xs' : 'text-sm'}`}
                title='Attiva/Disattiva Libero per squadra casa (sostituisce C1/C2 in seconda linea)'
              >
                🟡 {isMobile ? 'L' : 'L Casa'}
              </button>

              <button
                onClick={toggleLiberoAway}
                className={`absolute ${
                  isMobile
                    ? 'right-1 top-2'
                    : 'right-2 top-1/2 transform -translate-y-1/2'
                } px-2 py-1 text-xs rounded-lg font-medium transition-all z-10 ${
                  liberoModeAway
                    ? 'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isMobile ? 'min-h-[36px] text-xs' : 'text-sm'}`}
                title='Attiva/Disattiva Libero per squadra ospiti (sostituisce C1/C2 in seconda linea)'
              >
                🟡 {isMobile ? 'L' : 'L Ospiti'}
              </button>
            </>
          )}

          <div className='border-2 border-gray-500 bg-green-50 rounded-lg shadow-lg overflow-auto'>
            {/* Container responsive per il canvas */}
            <div className='flex justify-center items-center min-h-0'>
              {/* @ts-ignore */}
              <Stage width={canvasSize.width} height={canvasSize.height}>
                <Layer>
                  {/* Campo - dimensioni scalate automaticamente */}
                  <Rect
                    x={0}
                    y={0}
                    width={450 * canvasSize.scale}
                    height={450 * canvasSize.scale}
                    stroke='black'
                    fill='#eeeeee'
                    strokeWidth={2 * canvasSize.scale}
                  />
                  <Rect
                    x={450 * canvasSize.scale}
                    y={0}
                    width={450 * canvasSize.scale}
                    height={450 * canvasSize.scale}
                    fill='white'
                    stroke='black'
                    strokeWidth={2 * canvasSize.scale}
                  />
                  <Line
                    points={[
                      450 * canvasSize.scale,
                      0,
                      450 * canvasSize.scale,
                      450 * canvasSize.scale,
                    ]}
                    stroke='black'
                    strokeWidth={3 * canvasSize.scale}
                  />
                  <Line
                    points={[
                      300 * canvasSize.scale,
                      0,
                      300 * canvasSize.scale,
                      450 * canvasSize.scale,
                    ]}
                    stroke='#888'
                    dash={[5 * canvasSize.scale, 5 * canvasSize.scale]}
                  />
                  <Line
                    points={[
                      600 * canvasSize.scale,
                      0,
                      600 * canvasSize.scale,
                      450 * canvasSize.scale,
                    ]}
                    stroke='#888'
                    dash={[5 * canvasSize.scale, 5 * canvasSize.scale]}
                  />

                  {players.map((p) => (
                    <Player
                      key={p.id}
                      x={p.x * canvasSize.scale}
                      y={p.y * canvasSize.scale}
                      role={convertRoleToDisplay(p.role, p.id)}
                      color={falli.includes(p.id) ? 'red' : p.color}
                      scale={canvasSize.scale}
                      draggable={p.team === 'home'}
                      onDragEnd={(pos) =>
                        handleDrag(p.id, {
                          x: pos.x / canvasSize.scale,
                          y: pos.y / canvasSize.scale,
                        })
                      }
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* FEEDBACK VISUALE */}
        {feedback && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-800 text-sm font-medium animate-pulse'>
            {feedback}
          </div>
        )}

        {/* PULSANTI DI ROTAZIONE - OTTIMIZZATI PER MOBILE */}
        <div
          className={`flex gap-2 flex-wrap justify-center ${
            isMobile ? 'gap-1' : 'gap-4'
          }`}
        >
          <button
            onClick={() => rotateTeam('home')}
            className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-all ${
              isMobile ? 'px-4 py-3 text-sm min-h-[50px]' : 'px-6 py-3'
            }`}
          >
            🔄 {isMobile ? 'Mia' : 'Ruota Squadra Mia'}
          </button>
          <button
            onClick={() => rotateTeam('away')}
            className={`bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-all ${
              isMobile ? 'px-4 py-3 text-sm min-h-[50px]' : 'px-6 py-3'
            }`}
          >
            🔄 {isMobile ? 'Avversari' : 'Ruota Avversari'}
          </button>
          <button
            onClick={rotateBothTeams}
            className={`bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-md transition-all ${
              isMobile ? 'px-4 py-3 text-sm min-h-[50px]' : 'px-6 py-3'
            }`}
          >
            🔄 {isMobile ? 'Entrambe' : 'Ruota Entrambe'}
          </button>
        </div>

        {/* INDICATORI STATO */}
        <div className='text-center space-y-2'>
          {falli.length > 0 ? (
            <div className='text-red-600 font-bold bg-red-50 border border-red-200 rounded-lg px-4 py-2'>
              ⚠️ Fallo di posizione rilevato sui giocatori: {falli.join(', ')}
            </div>
          ) : (
            <div className='text-green-600 font-semibold bg-green-50 border border-green-200 rounded-lg px-4 py-2'>
              ✅ Nessun fallo di posizione
            </div>
          )}

          {/* Indicatori di stato */}
          <div className='flex gap-2 flex-wrap justify-center'>
            <div
              className={`text-sm px-3 py-1 rounded-full inline-flex items-center ${
                isUnder13Mode
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {isUnder13Mode ? '🟠' : '🔵'} Modalità{' '}
              <strong className='ml-1'>
                {isUnder13Mode ? 'Under 13' : 'Senior'}
              </strong>
              <span className='ml-1 text-xs opacity-75'>(salvata)</span>
            </div>

            {/* Indicatori Libero - Solo in modalità Senior */}
            {!isUnder13Mode && (liberoModeHome || liberoModeAway) && (
              <div className='bg-yellow-100 text-yellow-800 border border-yellow-200 text-sm px-3 py-1 rounded-full inline-flex items-center'>
                🟡 Libero: {liberoModeHome && 'Casa'}{' '}
                {liberoModeHome && liberoModeAway && ' + '}{' '}
                {liberoModeAway && 'Ospiti'}
              </div>
            )}
          </div>
        </div>

        {/* PANNELLI INFORMATIVI */}
        {showReceiveMode && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md'>
            <h3 className='font-bold text-blue-800 mb-2'>
              📋 Info Posizioni Ricezione
            </h3>
            <div className='text-sm text-blue-700'>
              <p className='mb-2'>
                <strong>Rotazione attuale:</strong>
                <br />
                <span className='text-blue-800 font-medium'>
                  {formatRotationKeyForDisplay(
                    getCurrentRotationKey(
                      players.filter((p) => p.team === 'home')
                    )
                  )}
                </span>
              </p>
              <p className='mb-2'>
                <strong>Posizioni salvate:</strong> {savedPositions.length}
              </p>

              {loading && (
                <div className='bg-yellow-100 border border-yellow-300 rounded p-2 mb-2'>
                  <p className='text-yellow-800'>🔄 Caricamento in corso...</p>
                </div>
              )}

              {savedPositions.length > 0 && (
                <div>
                  <strong>Rotazioni memorizzate:</strong>
                  <ul className='list-disc list-inside mt-1'>
                    {savedPositions.map((position) => (
                      <li key={position.id} className='text-xs'>
                        <strong className='text-blue-700'>
                          {formatRotationKeyForDisplay(position.rotationKey)}
                        </strong>
                        <span className='text-gray-500 ml-1'>
                          ({position.updatedAt.toLocaleDateString()})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className='mt-3 p-2 bg-gray-100 rounded text-xs'>
                <p>
                  <strong>💡 Controlli migliorati:</strong>
                </p>
                <ul className='list-disc list-inside mt-1 space-y-1'>
                  <li>
                    <strong>"Salva Ricezione":</strong> Salva solo la rotazione
                    attuale
                  </li>
                  <li>
                    <strong>"Carica Ricezione":</strong> Caricamento silenzioso
                    (nessun popup)
                  </li>
                  <li>
                    <strong>"Reset Posizioni":</strong> Ripristina le posizioni
                    base della rotazione
                  </li>
                  <li>
                    <strong>"🟡 L Casa/Ospiti":</strong> Attiva Libero (solo
                    Senior) - sostituisce C1/C2 in seconda linea
                  </li>
                  <li>
                    <strong>Ricezioni separate:</strong> Senior e Under 13 hanno
                    salvataggi indipendenti
                  </li>
                  <li>
                    <strong>"Salva Formazione":</strong> Richiede solo squadra e
                    descrizione
                  </li>
                  <li>Trascina i giocatori dove vuoi, poi salva</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {showFormations && (
          <div className='bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl'>
            <h3 className='font-bold text-green-800 mb-3'>
              📋 Gestione Formazioni
            </h3>

            {loading && (
              <div className='bg-yellow-100 border border-yellow-300 rounded p-2 mb-3'>
                <p className='text-yellow-800'>🔄 Operazione in corso...</p>
              </div>
            )}

            <div className='grid grid-cols-1 gap-4'>
              {/* Statistiche */}
              <div className='bg-white rounded p-3 border'>
                <h4 className='font-semibold text-gray-800 mb-2'>
                  📊 Statistiche
                </h4>
                <p className='text-sm text-gray-600'>
                  <strong>Formazioni salvate:</strong> {savedFormations.length}
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Squadre diverse:</strong> {teamNames.length}
                </p>
              </div>

              {/* Lista formazioni per squadra */}
              {teamNames.map((teamName) => {
                const teamFormations = savedFormations.filter(
                  (f) => f.teamName === teamName
                );
                return (
                  <div key={teamName} className='bg-white rounded p-3 border'>
                    <h4 className='font-semibold text-gray-800 mb-2'>
                      🏐 {teamName}
                    </h4>
                    <div className='space-y-2'>
                      {teamFormations.map((formation) => (
                        <div
                          key={formation.id}
                          className='flex items-center justify-between bg-gray-50 rounded p-2'
                        >
                          <div className='flex-1'>
                            <p className='font-medium text-sm'>
                              {formation.name}
                            </p>
                            {formation.description && (
                              <p className='text-xs text-gray-500'>
                                {formation.description}
                              </p>
                            )}
                            <p className='text-xs text-gray-400'>
                              {formation.updatedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className='flex gap-2'>
                            <button
                              onClick={() => loadFormation(formation.id!)}
                              disabled={loading}
                              className='bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 disabled:opacity-50'
                            >
                              📥 Carica
                            </button>
                            <button
                              onClick={() =>
                                deleteFormation(formation.id!, formation.name)
                              }
                              disabled={loading}
                              className='bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600 disabled:opacity-50'
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                      {teamFormations.length === 0 && (
                        <p className='text-xs text-gray-500 italic'>
                          Nessuna formazione salvata
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {teamNames.length === 0 && (
                <div className='bg-white rounded p-3 border text-center'>
                  <p className='text-gray-500 text-sm'>
                    Nessuna formazione salvata. Salva la prima formazione per
                    iniziare!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {showLoadFormations && (
          <div className='bg-white border border-gray-300 rounded-lg p-4 max-w-2xl shadow-lg'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='font-bold text-gray-800 text-lg'>
                📂 Carica Formazione
              </h3>
              <button
                onClick={() => setShowLoadFormations(false)}
                className='text-gray-500 hover:text-gray-700 text-xl'
              >
                ✕
              </button>
            </div>

            {loading && (
              <div className='bg-blue-100 border border-blue-300 rounded p-3 mb-4'>
                <p className='text-blue-800'>🔄 Caricamento in corso...</p>
              </div>
            )}

            {savedFormations.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-gray-500 text-lg mb-2'>
                  📝 Nessuna formazione salvata
                </p>
                <p className='text-gray-400 text-sm mb-4'>
                  Salva prima una formazione con il pulsante "💾 Salva
                  Formazione"
                </p>
                <div className='bg-yellow-100 border border-yellow-300 rounded p-3 text-left'>
                  <p className='text-yellow-800 text-sm'>
                    <strong>🔍 Debug Info:</strong>
                  </p>
                  <p className='text-yellow-700 text-xs mt-1'>
                    Formazioni caricate: {savedFormations.length} | Squadre:{' '}
                    {teamNames.length}
                  </p>
                  <button
                    onClick={() => {
                      console.log('🔄 Ricaricamento forzato...');
                      loadFormations();
                    }}
                    className='mt-2 bg-yellow-600 text-white px-3 py-1 text-xs rounded hover:bg-yellow-700'
                  >
                    🔄 Ricarica
                  </button>
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                <p className='text-sm text-gray-600 mb-3'>
                  <strong>Totale formazioni:</strong> {savedFormations.length} |{' '}
                  <strong>Squadre:</strong> {teamNames.length}
                </p>

                {teamNames.map((teamName) => {
                  const teamFormations = savedFormations.filter(
                    (f) => f.teamName === teamName
                  );
                  return (
                    <div
                      key={teamName}
                      className='border rounded-lg p-3 bg-gray-50'
                    >
                      <h4 className='font-semibold text-gray-800 mb-3 flex items-center'>
                        🏐 <span className='ml-2'>{teamName}</span>
                        <span className='ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full'>
                          {teamFormations.length} formazioni
                        </span>
                      </h4>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        {teamFormations.map((formation) => (
                          <div
                            key={formation.id}
                            className='bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow'
                          >
                            <div className='mb-2'>
                              <h5 className='font-medium text-gray-800'>
                                {formation.name}
                              </h5>
                              {formation.description && (
                                <p className='text-xs text-gray-500 mt-1'>
                                  {formation.description}
                                </p>
                              )}
                              <p className='text-xs text-gray-400 mt-1'>
                                📅 {formation.updatedAt.toLocaleDateString()}{' '}
                                alle {formation.updatedAt.toLocaleTimeString()}
                              </p>
                            </div>

                            <div className='flex gap-2'>
                              <button
                                onClick={() => {
                                  loadFormation(formation.id!);
                                  setShowLoadFormations(false);
                                }}
                                disabled={loading}
                                className='flex-1 bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium'
                              >
                                📥 Carica Formazione
                              </button>
                              <button
                                onClick={() =>
                                  deleteFormation(formation.id!, formation.name)
                                }
                                disabled={loading}
                                className='bg-red-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-600 disabled:opacity-50'
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className='mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <p className='text-sm text-blue-800'>
                <strong>💡 Come funziona:</strong>
              </p>
              <ul className='text-xs text-blue-700 mt-2 space-y-1'>
                <li>
                  • Clicca "📥 Carica Formazione" per applicare la formazione al
                  campo
                </li>
                <li>
                  • La formazione include le posizioni di entrambe le squadre
                </li>
                <li>• Usa "🗑️" per eliminare formazioni non più necessarie</li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Team Manager */}
        {showTeamManager && (
          <TeamManager
            currentTeam={currentTeam}
            onTeamSelected={handleTeamSelected}
          />
        )}

        {/* Debug Component per troubleshooting */}
        <DebugTeamLoading />
      </div>
    </div>
  );
};

export default VolleyballCourt;
