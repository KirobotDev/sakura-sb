require('dotenv').config();

methods = {
    1: "edit",
    2: "send",
    3: "dynamic"
}

function getNonce() {return Math.floor(Math.random() * 1000000)}

const version = "0.0.3 Beta"
const sbName = "W-SB"

const visible_spoiler_invisible = "||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||"
const alphabet = 'abcdefghijklmnopqrstuvwxyz'
const chars = alphabet + alphabet.toUpperCase() + "0123456789"
const roleColors = [0, 1752220, 1146986, 3066993, 2067276, 3447003, 2123412, 10181046, 7419530, 15277667, 11342935, 15844367, 12745742, 15105570, 11027200, 15158332, 10038562, 6323595, 9936031]

const randomString = (length) => {
    let result = ""

    for (let i = 0; i < length; i++) {
        const randIndex = Math.floor(Math.random() * chars.length)
        result += chars[randIndex]
    }

    return result
}

const updateSpotifyData = async (client) => {
    const connectionsResponse = await fetch("https://discord.com/api/v10/users/@me/connections", {
        headers: {
            Authorization: client.token,
            "Content-Type": "application/json"
        }
    })

    const connections = await connectionsResponse.json()

    for (const connection of connections) {
        if (connection.type !== "spotify") continue
        client.spotifyData = connection
        client.spotifyToken = connection.access_token
        break
    }
}

// Fonction de traduction
function translate(key, language = 'en', replacements = {}) {
    try {
        // Purger le cache pour toujours avoir la dernière version du fichier
        delete require.cache[require.resolve('./translations.json')];
        const translations = require('./translations.json');
        
        // Chercher dans la langue demandée, sinon EN, sinon retourner null
        let text = translations[language]?.[key];
        if (!text) {
            text = translations.en[key];
        }
        if (!text) {
            // Si la clé n'existe vraiment pas, retourner null
            return null;
        }
        
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(`{${k}}`, v);
        }
        
        return text;
    } catch (err) {
        console.error('Translation error:', err);
        return null;
    }
}

// utils.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function logToDiscord(message, type = 'INFO') {
    const webhookUrl = process.env.LOGS_WEBHOOK_URL;
    
    // Configuration des types de logs
    const types = {
        'INFO':    { color: 0x3498db, emoji: 'ℹ️', title: 'Information' },
        'SUCCESS': { color: 0x2ecc71, emoji: '✅', title: 'Succès' },
        'ERROR':   { color: 0xe74c3c, emoji: '❌', title: 'Erreur' },
        'SYSTEM':  { color: 0xf1c40f, emoji: '⚙️', title: 'Système' }
    };

    const config = types[type] || types['INFO'];
    const timestamp = new Date().toLocaleString('fr-FR');

    // Log console classique (pour garder une trace locale)
    console.log(`${message}`);

    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "Sakura Logs",
                avatar_url: "https://media.discordapp.net/attachments/1389608250420498544/1473381473611419782/sakura_sb.png",
                embeds: [{
                    title: `${config.emoji} ${config.title}`,
                    description: message,
                    color: config.color,
                    footer: { text: `Sakura $B` },
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (err) {
        console.error("❌ Erreur d'envoi Webhook:", err.message);
    }
}

async function logToDiscordCmd(commandName = '', args = '', username = '') {
    const webhookUrl = process.env.LOGS_CMDS_WEBHOOK_URL;

    const timestamp = new Date().toLocaleString('fr-FR');

    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `Sakura Command Logs`,
                avatar_url: "https://media.discordapp.net/attachments/1389608250420498544/1473381473611419782/sakura_sb.png",
                embeds: [{
                    title: `⚙️ Exécution de commande - ${commandName}`,
                    description: `Auteur: ${username}\nCommande: ${commandName}\nArguments: ${args}`,
                    color: 0xf1c40f,
                    footer: { text: `Sakura $B` },
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (err) {
        console.error("❌ Erreur d'envoi Webhook:", err.message);
    }
}

// Fonction pour gérer les erreurs Discord API
function handleDiscordAPIError(error, context = '') {
    const errorInfo = {
        message: error.message,
        code: error.code,
        httpStatus: error.httpStatus,
        method: error.method,
        path: error.path,
        context: context
    };

    // Erreurs non-critiques à ignorer silencieusement
    const ignorableErrors = [
        50013, // Cannot edit messages from other users
        50027, // Invalid webhook token
        10003, // Unknown channel
        10008, // Unknown message
        50005, // Cannot edit messages older than 2 weeks
        10015  // Unknown emoji
    ];

    if (ignorableErrors.includes(error.code)) {
        // Log discret uniquement en cas de debug
        console.log(`[${context}] Erreur Discord prévisible: ${error.code} - ${error.message}`);
        return false;
    }

    // Erreurs critiques ou session_id manquant (rate limiting, auth issues)
    if (error.httpStatus === 400 && error.message.includes('session_id')) {
        console.warn(`[${context}] ⚠️ Erreur session_id: ${error.message}`);
        logToDiscord(`[${context}] ⚠️ Discord API Error (session_id): ${error.message}`, 'WARN');
        return false;
    }

    // Erreurs 401/403 = auth issues
    if (error.httpStatus === 401 || error.httpStatus === 403) {
        console.error(`[${context}] ❌ Erreur authentification: ${error.message}`);
        logToDiscord(`[${context}] ❌ Authentication Error: ${error.message}`, 'ERROR');
        return true; // Critical
    }

    // Rate limiting (429)
    if (error.httpStatus === 429) {
        console.warn(`[${context}] ⚠️ Rate limited: ${error.message}`);
        logToDiscord(`[${context}] ⚠️ Rate Limited`, 'WARN');
        return false;
    }

    // Autres erreurs
    console.error(`[${context}] ❌ Erreur Discord: ${error.code} - ${error.message}`);
    logToDiscord(`[${context}] ❌ Discord Error (${error.code}): ${error.message}`, 'ERROR');
    return false;
}

module.exports = {
    sbName,
    version,
    methods,
    getNonce,
    alphabet,
    chars,
    randomString,
    updateSpotifyData,
    translate,
    logToDiscord,
    logToDiscordCmd,
    handleDiscordAPIError
}