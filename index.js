const { Collection, Client, RichPresence } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const { sbName, version, logToDiscord, handleDiscordAPIError } = require('./utils.js');

// Chemin absolu vers la configuration
const configPath = path.resolve(__dirname, './config.json');
let config = require('./config.json');

const { HttpsProxyAgent } = require('https-proxy-agent');

// --- LISTE DE TES PROXYS ---
// Format: http://user:pass@ip:port ou http://ip:port
const proxyList = [
    'http://147.45.251.242:8888',
    'http://109.73.195.10:8888',
    'http://34.166.25.120:8080',
    'http://5.129.206.247:8080',
    'http://104.238.30.63:63744',
    'http://192.252.214.17:4145'
];

let proxyIndex = 0;

/**
 * Supprime un compte invalide du fichier de configuration
 */
const removeAccountFromConfig = (token) => {
    config.accounts = config.accounts.filter(acc => acc.token !== token);
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        logToDiscord(`[Système] Token invalide supprimé de config.json.`, 'SYSTEM');
    } catch (err) {
        logToDiscord(`[Erreur] Impossible de mettre à jour config.json: ${err.message}`, 'ERROR');
    }
};

/**
 * Vérifie si le premium est expiré
 */
function isPremiumExpired(premiumExpiresAt) {
    if (!premiumExpiresAt) return false;
    return Date.now() > premiumExpiresAt;
}

/**
 * Initialise et configure un client selfbot
 */
const startBot = (accountConfig, globalSettings) => {

    // Sélection d'un proxy dans la liste (rotation)
    const proxyUrl = proxyList[proxyIndex % proxyList.length];
    proxyIndex++;

    const agent = new HttpsProxyAgent(proxyUrl);

    const client = new Client({
        http: {
            agent: agent
        }
    });
    // Initialisation du client avec l'agent proxy
    logToDiscord(`[${accountConfig.name}] Utilisation du proxy : ${proxyUrl.split('@')[1] || proxyUrl}`, 'INFO');

    client.config = accountConfig;
    client.globalSettings = globalSettings;
    client.commands = new Collection();
    client.aliases = new Collection();
    client.snipes = {}; // Stockage local des messages supprimés



    // Ensure AFK config structure
    if (!client.config.afk) {
        client.config.afk = { enabled: false, message: "Je suis AFK", once_enabled: false, once_users: [] };
    } else {
        if (client.config.afk.once_enabled === undefined) client.config.afk.once_enabled = false;
        if (!client.config.afk.once_users) client.config.afk.once_users = [];
    }

    // Chargement des catégories de commandes
    try {
        client.categories = fs.readdirSync("./commands/");
    } catch (err) {
        client.categories = [];
    }

    // Getter dynamique pour le statut premium
    Object.defineProperty(client.config, 'is_premium', {
        get() {
            if (!this.premium_expires_at) return false;
            return !isPremiumExpired(this.premium_expires_at);
        },
        enumerable: true,
        configurable: true
    });

    // Chargement du handler de commandes
    ["command"].forEach(handler => {
        try {
            require(`./handlers/${handler}`)(client);
        } catch (err) {
            logToDiscord(`[${accountConfig.name}] Erreur handler ${handler}: ${err.message}`, 'ERROR');
        }
    });

    // --- GESTION DES ÉVÉNEMENTS ---

    // Snipe : Enregistrement des messages supprimés
    client.on('messageDelete', message => {
        if (!message.author || message.author.bot) return;
        let channelSnipes = client.snipes[message.channel.id] || [];
        channelSnipes.unshift({
            content: message.content,
            authorTag: message.author.tag,
            authorId: message.author.id,
            time: Date.now(),
            attachments: message.attachments.first()?.proxyURL || null
        });
        if (channelSnipes.length > 10) channelSnipes = channelSnipes.slice(0, 10);
        client.snipes[message.channel.id] = channelSnipes;
    });

    // Anti-Group : Quitter les groupes automatiquement
    client.on('channelCreate', async (channel) => {
        if ((channel.type === 'GROUP_DM' || channel.type === 3) && client.config.antigroup === true) {
            setTimeout(async () => {
                await channel.delete().catch((error) => {
                    handleDiscordAPIError(error, `[${client.user.username}] Anti-Group`);
                });
                logToDiscord(`[${client.user.username}] 🛡️ Groupe quitté automatiquement`, 'INFO');
            }, 1500);
        }
    });

    // Ready : Initialisation des modules (RPC, Auto-Bump, etc.)
    client.on('ready', async () => {
        logToDiscord(`[${client.user.username}] Bot connecté ! ✅`, 'SUCCESS');

        // Mise à jour du pseudo dans la config si nécessaire
        const accountIndex = config.accounts.findIndex(acc => acc.token === accountConfig.token);
        if (accountIndex !== -1 && config.accounts[accountIndex].name !== client.user.username) {
            config.accounts[accountIndex].name = client.user.username;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        }

        // --- Fonctions internes au Ready ---

        const runRPC = async () => {
            if (client.config.rpc_enabled === false) return;
            if (["705o", "slainsrp"].includes(client.user.username)) return;

            const richPresence = new RichPresence(client);
            const rpcConfig = client.config.rpc || {};

            richPresence
                .setName(rpcConfig.name || 'Sakura $B')
                .setType(rpcConfig.type || 'PLAYING')
                .setDetails(rpcConfig.details || 'Sakura $B On Top ! Best $B !')
                .setState(rpcConfig.state || 'https://discord.gg/ZhW9BPJ94n')
                .setAssetsLargeImage(client.config.largeimage || 'https://media.discordapp.net/attachments/1475553859131932690/1476390991798865971/sakura_sb.png?ex=69a0f3c2&is=699fa242&hm=81098420c379c35b0a61a3b80e06add6b4ccd91f2d6e72eb0e063f0a447d0f14&=&format=webp&quality=lossless&width=1421&height=1421')
                .setAssetsSmallImage(client.config.smallimage || 'https://media.discordapp.net/attachments/1475553859131932690/1476391046568214538/X_Corp.png?ex=69a0f3cf&is=699fa24f&hm=c8a496336569cf3736616f87e86e653f38f62d4d042eec9ea91934d6827462aa&=&format=webp&quality=lossless&width=1421&height=1421')
                .setStartTimestamp(Date.now());

            if (richPresence.name === 'Sakura $B') {
                richPresence.setButtons([
                    { name: 'Join Us !', url: 'https://discord.com/invite/kbySekub34' },
                    { name: 'We are waiting for you !', url: 'https://discord.gg/kbySekub34' }
                ]);
            }
            client.user.setPresence({ status: rpcConfig.status || 'dnd', activities: [richPresence] });
        };

        const autoBump = async () => {
            if (client.config.autobump?.enabled && client.config.autobump.channels.length > 0) {
                for (const channelId of client.config.autobump.channels) {
                    try {
                        const channel = await client.channels.fetch(channelId);
                        if (channel) await channel.sendSlash('302050872383242240', 'bump');
                    } catch (error) {
                        const isCritical = handleDiscordAPIError(error, `[${client.user.username}] AutoBump`);
                        if (isCritical) break; // Stop si erreur critique
                    }
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            setTimeout(autoBump, 7260000);
        };

        runRPC();
        autoBump();
        client.runRPC = runRPC;
    });

    // --- GESTION DES ERREURS PENDANT L'EXÉCUTION ---

    // Erreurs du client Discord (ex: authentification échouée)
    client.on('error', (error) => {
        logToDiscord(`[${accountConfig.name}] Erreur client: ${error.message}`, 'ERROR');

        // Erreur 4004 = Authentication failed (token invalide)
        if (error.message.includes('4004') || error.message.includes('Authentication failed')) {
            logToDiscord(`[${accountConfig.name}] ⚠️ Token invalide détecté! Suppression du compte...`, 'ERROR');
            removeAccountFromConfig(accountConfig.token);
            client.destroy().catch(() => { });
        }
    });

    // Erreur de reconnexion
    client.on('shardError', (error) => {
        logToDiscord(`[${accountConfig.name}] Erreur shard: ${error.message}`, 'ERROR');
    });

    // Disconnecte
    client.on('shardDisconnect', ({ wasClean }) => {
        if (!wasClean) {
            logToDiscord(`[${accountConfig.name}] Déconnexion non-propre détectée`, 'WARN');
        }
    });

    // Reconnecte réussie
    client.on('shardReconnecting', () => {
        logToDiscord(`[${accountConfig.name}] Tentative de reconnexion...`, 'SYSTEM');
    });
    client.on('messageCreate', async message => {
        if (message.author.bot) return;

        // Mimic
        const mimicList = client.config.mimic || [];
        if (mimicList.includes(message.author.id)) {
            if (message.content) message.channel.send(message.content).catch((error) => {
                handleDiscordAPIError(error, `[${client.user.username}] Mimic (content)`);
            });
            if (message.attachments.size > 0) message.channel.send({ files: Array.from(message.attachments.values()) }).catch((error) => {
                handleDiscordAPIError(error, `[${client.user.username}] Mimic (attachments)`);
            });
        }

        // Auto-React
        const arList = client.config.autoreact || [];
        const targetAR = arList.find(t => t.id === message.author.id);
        if (targetAR) message.react(targetAR.emoji).catch((error) => {
            handleDiscordAPIError(error, `[${client.user.username}] AutoReact`);
        });

        // AFK (DMs)
        if (message.guild === null && client.config.afk?.enabled && message.author.id !== client.user.id) {
            // Check if once mode is enabled
            if (client.config.afk.once_enabled) {
                // Check if this user already received a response
                if (!client.config.afk.once_users) client.config.afk.once_users = [];

                if (client.config.afk.once_users.includes(message.author.id)) {
                    // User already got a response, skip
                    return;
                }

                // Add user to the list and save
                client.config.afk.once_users.push(message.author.id);

                // Save to config.json
                const configPath = require('path').resolve(__dirname, './config.json');
                const fullConfig = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
                const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
                if (accountIndex !== -1) {
                    fullConfig.accounts[accountIndex].afk.once_users = client.config.afk.once_users;
                    require('fs').writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                }
            }

            return message.reply(client.config.afk.message).catch((error) => {
                handleDiscordAPIError(error, `[${client.user.username}] AFK Reply`);
            });
        }

        // Commandes
        if (message.author.id !== client.user.id) return;
        const prefix = client.config.prefix || ">";
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const cmdName = args.shift().toLowerCase();
        const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));

        if (command) {
            try {
                command.run(message, args, command, client);
            } catch (error) {
                logToDiscord(`Erreur commande ${cmdName}: ${error.message}`, 'ERROR');
            }
        }
    });

    client.login(accountConfig.token).catch((err) => {
        logToDiscord(`[Erreur] Login échoué pour ${accountConfig.name}: ${err.message}`, 'ERROR');

        // On retire le token du fichier config (comme vous l'avez prévu)
        removeAccountFromConfig(accountConfig.token);

        // Correction du crash : On vérifie si client.destroy existe et renvoie bien une promesse
        if (client && typeof client.destroy === 'function') {
            const p = client.destroy();
            if (p && typeof p.catch === 'function') {
                p.catch(() => { });
            }
        }
    });

    return client;
};

// --- SYSTÈME DE GESTION MULTI-COMPTES INTELLIGENT ---

let activeClients = [];
let lastKnownTokens = []; // Historique des tokens pour détecter les nouveaux

const startAllBots = () => {
    // Rechargement forcé de la config
    try {
        delete require.cache[require.resolve('./config.json')];
        config = require('./config.json');
    } catch (e) {
        return console.error("Erreur lecture config.json:", e.message);
    }

    if (!config.accounts || config.accounts.length === 0) {
        return logToDiscord(`[Système] Aucun compte dans config.json.`, 'SYSTEM');
    }

    logToDiscord(`[Système] Lancement de ${config.accounts.length} compte(s)...`, 'SYSTEM');
    lastKnownTokens = config.accounts.map(acc => acc.token); // Sauvegarde des tokens actuels
    config.accounts.forEach(acc => {
        activeClients.push(startBot(acc, config.settings));
    });
};

// Fonction intelligente pour détecter et lancer UNIQUEMENT les nouveaux comptes
const checkForNewAccounts = () => {
    try {
        delete require.cache[require.resolve('./config.json')];
        const newConfig = require('./config.json');

        if (!newConfig.accounts || newConfig.accounts.length === 0) return;

        const newTokens = newConfig.accounts.map(acc => acc.token);
        const tokensAdded = newTokens.filter(token => !lastKnownTokens.includes(token));

        if (tokensAdded.length > 0) {
            logToDiscord(`[Système] ${tokensAdded.length} nouveau(x) compte(s) détecté(s)!`, 'SYSTEM');

            // Lancer UNIQUEMENT les nouveaux comptes
            tokensAdded.forEach(token => {
                const newAccount = newConfig.accounts.find(acc => acc.token === token);
                if (newAccount) {
                    logToDiscord(`[Système] Lancement du compte: ${newAccount.name}`, 'SYSTEM');
                    activeClients.push(startBot(newAccount, newConfig.settings));
                }
            });

            // Mise à jour de l'historique
            lastKnownTokens = newTokens;
            config = newConfig; // Mise à jour de la config globale
        }
    } catch (e) {
        logToDiscord(`[Erreur] Impossible de vérifier les nouveaux comptes: ${e.message}`, 'ERROR');
    }
};

// Surveillance du fichier config.json - SANS relancer tous les bots
fs.watch(configPath, (event) => {
    if (event === 'change') {
        setTimeout(checkForNewAccounts, 1000); // Délai de sécurité pour l'écriture
    }
});

// Lancement initial
startAllBots();