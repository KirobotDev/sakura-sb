import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import fs from 'fs';
import path from 'path';

// --- Chargement du config.json ---
// On utilise process.cwd() pour être sûr de pointer vers la racine du projet
// --- Chargement du config.json ---
const configPath = path.join(process.cwd(), '../config.json');

let config: any;
try {
    const rawData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(rawData);
    
    // Vérification interne
    if (!config.accounts || !Array.isArray(config.accounts)) {
        throw new Error("Le format du config.json est invalide (manque le tableau 'accounts')");
    }
} catch (err) {
    console.error(`[ERREUR FATALE] Impossible de charger la configuration : ${err.message}`);
    process.exit(1);
}
async function startAccount(account: any) {
    return new Promise<void>((resolve) => {
        if (!account.token) return resolve();

        const client = new ClientQuest(account.token);

        // --- LA PROTECTION ANTI-CRASH ULTIME ---
        // On écoute TOUTES les erreurs du client pour empêcher le process de mourir
        client.on('error', (err) => {
            console.error(`[${account.name}] ❌ Erreur détectée : ${err.message}`);
            // On résout immédiatement pour passer au compte suivant
            resolve();
        });

        // Sécurité supplémentaire : si après 15s rien ne se passe, on skip le compte
        const timeout = setTimeout(() => {
            console.log(`[${account.name}] ⏳ Délai de connexion dépassé, passage au suivant...`);
            resolve();
        }, 15000);

        client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
            clearTimeout(timeout); // On annule le timeout de sécurité
            console.log(`[${data.user.username}] ✅ SB Connecté.`);

            // Lancement différé des quêtes (comme demandé)
            setTimeout(async () => {
                try {
                    console.log(`[${data.user.username}] ⚡ Lancement des quêtes...`);
                    await client.fetchQuests();
                    const questsValid = client.questManager?.filterQuestsValid() || [];
                    for (const quest of questsValid) {
                        await client.questManager!.doingQuest(quest);
                    }
                } catch (e) {
                    //console.error(`[${data.user.username}] Erreur quêtes :`, e.message);
                }
            }, 5000);

            resolve();
        });

        try {
            client.connect();
        } catch (err) {
            console.error(`[${account.name}] Erreur de lancement connect()`);
            resolve();
        }
    });
}



// --- BOUCLE DE LANCEMENT PRINCIPALE ---
async function startAll() {
    console.log(`[AutoQuest] Initialisation de ${config.accounts.length} compte(s)...`);

    for (const account of config.accounts) {
        // On affiche le démarrage pour savoir où on en est
        console.log(`[Système] Tentative de connexion : ${account.name}...`);
        
        await startAccount(account);

        // Pause de 3 secondes entre chaque connexion de compte pour la stabilité IP
        await new Promise(res => setTimeout(res, 3000));
    }
    
    console.log(`[Système] Tous les comptes ont été traités.`);
}

startAll();
