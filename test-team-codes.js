/**
 * Script di test per verificare il sistema di condivisione team
 */

import { TeamCodeService } from './src/services/teamCodeService';

console.log('🧪 Test Sistema Team Codes\n');

// 1. Crea una squadra di test
console.log('1️⃣ Creazione squadra di test...');
const testTeam = TeamCodeService.createTeam('Test Volley Team');
console.log(`✅ Squadra creata: ${testTeam.name} (${testTeam.code})`);

// 2. Test generazione URL semplice
console.log('\n2️⃣ Test URL semplice...');
const simpleUrl = TeamCodeService.generateShareUrl(testTeam.code);
console.log(`🔗 URL semplice: ${simpleUrl}`);

// 3. Test generazione URL con dati embedded
console.log('\n3️⃣ Test URL con dati embedded...');
const advancedUrl = TeamCodeService.generateAdvancedShareUrl(testTeam);
console.log(`🔗 URL avanzato: ${advancedUrl}`);
console.log(`📏 Lunghezza URL: ${advancedUrl.length} caratteri`);

// 4. Test parsing dell'URL avanzato
console.log('\n4️⃣ Test parsing URL avanzato...');
// Simula l'URL in window.location
const urlParams = new URL(advancedUrl).search;
Object.defineProperty(window, 'location', {
  value: { search: urlParams },
  writable: true,
});

const parsedTeam = TeamCodeService.getTeamDataFromUrl();
if (parsedTeam) {
  console.log(`✅ Dati team parsati: ${parsedTeam.name} (${parsedTeam.code})`);
  console.log(
    `📅 Creato il: ${new Date(parsedTeam.createdAt).toLocaleDateString()}`
  );
} else {
  console.log('❌ Errore nel parsing dei dati team');
}

// 5. Test caricamento team esistente
console.log('\n5️⃣ Test caricamento team esistente...');
const loadedTeam = TeamCodeService.loadTeam(testTeam.code);
if (loadedTeam) {
  console.log(`✅ Team caricato dal localStorage: ${loadedTeam.name}`);
} else {
  console.log('❌ Team non trovato nel localStorage');
}

// 6. Test lista squadre
console.log('\n6️⃣ Test lista squadre...');
const allTeams = TeamCodeService.getAllTeams();
console.log(`📋 Squadre nel sistema: ${allTeams.length}`);
allTeams.forEach((team, index) => {
  console.log(
    `  ${index + 1}. ${team.name} (${team.code}) - Usata il: ${new Date(
      team.lastUsed
    ).toLocaleDateString()}`
  );
});

console.log('\n🎉 Test completati!');
