const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { sbName, version, logToDiscord } = require('./utils.js');

function startScript(scriptPath, cwd, label) {
    const child = spawn('node', [scriptPath], {
        cwd: cwd,
        stdio: 'inherit' 
    });

    child.on('error', (err) => {
        logToDiscord(`[${label}] Erreur : ${err.message}`, 'ERROR');
    });
}

let autoQuestProcess = null;

function startAutoQuest() {
    const aqPath = path.join(__dirname, 'AutoQuest');
    
    logToDiscord(`[Système] Tentative de démarrage AutoQuest...`, 'SYSTEM');
    logToDiscord(`[Système] Chemin détecté : ${aqPath}`, 'SYSTEM');

    if (!fs.existsSync(aqPath)) {
        logToDiscord(`[ERREUR] Dossier AutoQuest introuvable à : ${aqPath}`, 'ERROR');
        return;
    }

    const botPath = path.join(aqPath, 'bot.ts');

    autoQuestProcess = spawn('npx', [
        'tsx', 
        botPath                 // On lance juste le fichier
    ], {
        cwd: aqPath,            // Le cwd permet à dotenv de trouver le .env automatiquement
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PATH: process.env.PATH }
    });

    autoQuestProcess.on('spawn', () => {
        logToDiscord(`[AutoQuest] Processus lancé avec succès (npx tsx bot.ts) ! ✅`, 'SUCCESS');
    });

    autoQuestProcess.on('exit', (code) => {
        logToDiscord(`[AutoQuest] Arrêté (Code: ${code})`, 'SYSTEM');
    });

    autoQuestProcess.on('error', (err) => {
        logToDiscord(`[AutoQuest] Erreur spawn : ${err.message}`, 'ERROR');
    });
}

function restartAutoQuest() {
    logToDiscord(`[Cycle 24h] Redémarrage de AutoQuest en cours...`, 'SYSTEM');
    if (autoQuestProcess) {
        autoQuestProcess.kill('SIGKILL');
    }
    setTimeout(startAutoQuest, 5000);
}

// --- LANCEMENT ---
logToDiscord(`[${sbName}] Démarrage du manager (Version ${version})...`, 'SYSTEM');

// 1. Lance tes bots existants
startScript('index.js', __dirname, 'SELF');
startScript('bot.js', __dirname, 'BOT');

// 2. Lance AutoQuest
startAutoQuest();

// 3. Planifie le restart toutes les 24h
setInterval(restartAutoQuest, 86400000);