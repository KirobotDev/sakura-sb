const { log } = require('console');
const { sbName, version, logToDiscord } = require('./utils.js');

require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- CONFIGURATION ---
const configPath = path.resolve(__dirname, './config.json');
const STAFF_IDS = JSON.parse(process.env.STAFF_IDS || "[]");
const REQUEST_CHANNEL_ID = process.env.CHANNEL_REQUESTS_ID;

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.demandes = new Map();

client.save = async (client, config) => {
    try {
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        client.config = config; // Mise à jour en mémoire
        return true;
    } catch (err) {
        console.error('[SAVE ERROR]', err);
        return false;
    }
};

function isPotentiallyValidDiscordToken(token) {
    const parts = token.split('.');
    return parts.length === 3;
}

// Fonction pour calculer la date d'expiration du premium
function calculatePremiumExpiration(durationValue, durationUnit) {
    const now = new Date();
    const expiresAt = new Date(now);

    switch(durationUnit) {
        case 'days':
            expiresAt.setDate(expiresAt.getDate() + durationValue);
            break;
        case 'weeks':
            expiresAt.setDate(expiresAt.getDate() + (durationValue * 7));
            break;
        case 'months':
            expiresAt.setMonth(expiresAt.getMonth() + durationValue);
            break;
        case 'years':
            expiresAt.setFullYear(expiresAt.getFullYear() + durationValue);
            break;
    }

    return expiresAt.getTime();
}

// Fonction pour vérifier si le premium a expiré
function isPremiumExpired(premiumExpiresAt) {
    if (!premiumExpiresAt) return false;
    return Date.now() > premiumExpiresAt;
}

// Fonction pour nettoyer les premiums expirés
function cleanExpiredPremiums() {
    try {
        const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        let hasChanges = false;

        fullConfig.accounts.forEach(account => {
            if (account.premium_expires_at && isPremiumExpired(account.premium_expires_at)) {
                account.premium_expires_at = null;
                logToDiscord(`⏰ Premium expiré pour \`${account.name}\`, statut retiré.`, 'INFO');
                hasChanges = true;
            }
        });

        if (hasChanges) {
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
        }
    } catch (err) {
        logToDiscord(`❌ Erreur lors de la vérification des premiums expirés: ${err.message}`, 'ERROR');
    }
}

// Fonction de formatage de la date d'expiration
function formatExpirationDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const commands = [
    {
        name: 'login',
        description: 'Soumettre un token pour approbation',
        options: [{
            name: 'token',
            type: 3, 
            description: 'Le token du compte',
            required: true
        }]
    },
    {
        name: 'premium',
        description: '[STAFF] Gérer le statut premium des utilisateurs',
        options: [
            {
                name: 'action',
                type: 3,
                description: 'Action à effectuer',
                required: true,
                choices: [
                    { name: 'Donner premium', value: 'give' },
                    { name: 'Retirer premium', value: 'remove' },
                    { name: 'Liste des premiums', value: 'list' }
                ]
            },
            {
                name: 'username',
                type: 3,
                description: 'Nom d\'utilisateur (obligatoire pour give/remove)',
                required: false
            },
            {
                name: 'duration_value',
                type: 4,
                description: 'Durée (nombre)',
                required: false,
                minValue: 1
            },
            {
                name: 'duration_unit',
                type: 3,
                description: 'Unité de temps',
                required: false,
                choices: [
                    { name: 'Jour(s)', value: 'days' },
                    { name: 'Semaine(s)', value: 'weeks' },
                    { name: 'Mois', value: 'months' },
                    { name: 'Année(s)', value: 'years' }
                ]
            }
        ]
    },
    {
        name: 'accounts',
        description: '[STAFF] Voir la liste des comptes enregistrés',
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    logToDiscord(`🛡️ Master Bot en ligne : ${client.user.tag}`, 'SUCCESS');
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("✅ Slash Command /login enregistrée.");
        logToDiscord(`✅ Slash Command /login enregistrée.`, 'SUCCESS');
    } catch (error) {
        logToDiscord(`❌ Erreur Slash Commands: ${error.message}`, 'ERROR');
    }

    // Vérifier les premiums expirés au démarrage
    cleanExpiredPremiums();

    // Vérifier les premiums expirés toutes les heures
    setInterval(() => {
        cleanExpiredPremiums();
    }, 60 * 60 * 1000); // 1 heure
});

client.on('interactionCreate', async (interaction) => {
    
    // 1. GESTION DE LA COMMANDE /LOGIN
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'login') {
            const token = interaction.options.getString('token').replace(/"/g, '');

            if (!isPotentiallyValidDiscordToken(token)) {
                return interaction.reply({ content: "❌ Invalid token format.", flags: [ 64 ] });
            }

            await interaction.deferReply({ flags: [ 64 ] }); // 64 est le flag pour EPHEMERAL

            const res = await fetch('https://discord.com/api/v9/users/@me', {
                headers: { 'Authorization': token }
            });

            if (res.status !== 200) {
                return interaction.editReply("❌ Invalid or expired token (API Reject).");
            }

            const data = await res.json();
            const accountTag = `${data.username}${data.discriminator !== '0' ? `#${data.discriminator}` : ''}`;

            if (client.demandes.has(data.id)) {
                return interaction.editReply("🕑 This token already has a pending request.");
            }

            client.demandes.set(data.id, { 
                token: token, 
                senderId: interaction.user.id, // On garde l'ID de celui qui tape /login
                tag: accountTag 
            });

            // Récupération forcée du salon (API si pas de cache)
            let channel;
            try {
                channel = client.channels.cache.get(REQUEST_CHANNEL_ID) || await client.channels.fetch(REQUEST_CHANNEL_ID);
            } catch (e) {
                return interaction.editReply("❌ Error: Unable to find the requests channel.");
            }

            const embed = new EmbedBuilder()
                .setTitle('📥 New Token Request')
                .setColor(0x5865F2)
                .addFields(
                    { name: '👤 Requester', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` },
                    { name: '🔑 Target Account', value: `\`${accountTag}\` (\`${data.id}\`)` }
                )
                .setFooter({ text: "Click a button to approve or reject" })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`accept:::${data.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reject:::${data.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply("✅ Your request has been sent to staff.");
        }
        
        // 1.5 GESTION DE LA COMMANDE /PREMIUM
        if (interaction.commandName === 'premium') {
            if (!STAFF_IDS.includes(interaction.user.id)) {
                return interaction.reply({ content: "🚫 Only STAFF members can use this command.", flags: [ 64 ] });
            }

            const action = interaction.options.getString('action');
            const username = interaction.options.getString('username');
            const durationValue = interaction.options.getInteger('duration_value');
            const durationUnit = interaction.options.getString('duration_unit');

            try {
                const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

                // --- CAS 1 : LISTE DES PREMIUMS ---
                if (action === 'list') {
                    const premiums = fullConfig.accounts.filter(a => a.premium_expires_at && !isPremiumExpired(a.premium_expires_at));
                    
                    if (premiums.length === 0) {
                        return interaction.reply({ content: "ℹ️ Aucun compte n'a de premium actif.", flags: [ 64 ] });
                    }

                    const list = premiums.map(a => `• **${a.name}** : expire le ${formatExpirationDate(a.premium_expires_at)}`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('💎 Liste des Membres Premium')
                        .setDescription(list)
                        .setColor(0xF1C40F)
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed], flags: [ 64 ] });
                }

                // --- CAS 2 : MODIFICATION (GIVE/REMOVE) ---
                // On vérifie d'abord si le nom d'utilisateur est fourni pour ces actions
                if (!username) {
                    return interaction.reply({ content: "❌ Vous devez spécifier un nom d'utilisateur pour cette action.", flags: [ 64 ] });
                }

                const account = fullConfig.accounts.find(a => a.name === username);
                if (!account) {
                    return interaction.reply({ content: `❌ Compte \`${username}\` non trouvé dans la config.`, flags: [ 64 ] });
                }

                if (action === 'give') {
                    if (!durationValue || !durationUnit) {
                        return interaction.reply({ content: `❌ Précisez une durée (valeur + unité).`, flags: [ 64 ] });
                    }
                    const expiresAt = calculatePremiumExpiration(durationValue, durationUnit);
                    account.premium_expires_at = expiresAt;
                    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                    return interaction.reply({ content: `✅ Premium accordé à \`${username}\` jusqu'au **${formatExpirationDate(expiresAt)}**.`, flags: [ 64 ] });
                } 
                
                else if (action === 'remove') {
                    account.premium_expires_at = null;
                    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                    return interaction.reply({ content: `✅ Premium retiré de \`${username}\`.`, flags: [ 64 ] });
                }

            } catch (err) {
                console.error(err);
                return interaction.reply({ content: `❌ Erreur système lors de la commande premium.`, flags: [ 64 ] });
            }
        }

        if (interaction.commandName === 'accounts') {
            if (!STAFF_IDS.includes(interaction.user.id)) {
                return interaction.reply({ content: "🚫 Only STAFF members can use this command.", flags: [ 64 ] });
            }

            try {
                const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                
                if (fullConfig.accounts.length === 0) {
                    return interaction.reply({ content: "ℹ️ Aucun compte n'est enregistré dans la configuration.", flags: [ 64 ] });
                }

                const list = fullConfig.accounts.map(a => {
                    const isPremium = a.premium_expires_at && !isPremiumExpired(a.premium_expires_at);
                    return `• \`${a.name}\` ${isPremium ? '💎' : '👤'}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📂 Comptes Enregistrés')
                    .setDescription(list)
                    .setFooter({ text: `Total : ${fullConfig.accounts.length} comptes` })
                    .setColor(0x3498DB);

                return interaction.reply({ embeds: [embed], flags: [ 64 ] });
            } catch (err) {
                return interaction.reply({ content: "❌ Erreur lors de la lecture de la liste.", flags: [ 64 ] });
            }
        }
    }

    // 2. GESTION DES BOUTONS (ACCEPT / REJECT)
    if (interaction.isButton()) {
        const [action, targetId] = interaction.customId.split(':::');
        if (!['accept', 'reject'].includes(action)) return;

        if (!STAFF_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: "🚫 Vous n'êtes pas autorisé.", flags: [ 64 ] });
        }

        const demande = client.demandes.get(targetId);
        if (!demande) {
            return interaction.reply({ content: "❌ Demande expirée ou déjà traitée.", flags: [ 64 ] });
        }

        // On tente de récupérer l'utilisateur qui a fait la demande pour le MP
        const requester = await client.users.fetch(demande.senderId).catch(() => null);

        if (action === 'accept') {
            try {
                const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                
                if (fullConfig.accounts.some(a => a.token === demande.token)) {
                    return interaction.reply({ content: "⚠️ Déjà dans le config.json", flags: [ 64 ] });
                }

                fullConfig.accounts.push({
                    name: demande.tag,
                    token: demande.token,
                    prefix: ">",
                    language: "en",
                    premium_expires_at: null,
                    afk: { enabled: false, message: "Je suis AFK", once_enabled: false, once_users: [] },
                    autobump: { enabled: false, channels: [] },
                    tagrotator: { state: false, guilds: [], delay: 60 },
                    mimic: [],
                    autoreact: []
                });

                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));

                // --- NOTIFICATION MP ---
                if (requester) {
                    const acceptEmbed = new EmbedBuilder()
                        .setTitle('✅ Request Accepted')
                        .setColor(0x57F287)
                        .addFields(
                            { name: '🔑 Account', value: `\`${demande.tag}\`` },
                            { name: '👤 Requester', value: `<@${demande.senderId}> (\`${demande.senderId}\`)` },
                            { name: '✔️ Approved by', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` }
                        )
                        .addFields(
                            { name: '\n📖 __Getting Started__', value: '**Default prefix:** `>`\n**Change prefix:** `>prefix <new_prefix>`\n**Change language:** `>lang <fr|en>`' }
                        )
                        .setFooter({ text: "Your account has been successfully added!" })
                        .setTimestamp();
                    await requester.send({ embeds: [acceptEmbed] }).catch(() => {});
                }

                client.demandes.delete(targetId);
                const acceptedEmbed = new EmbedBuilder()
                    .setTitle('✅ Request Approved')
                    .setColor(0x57F287)
                    .addFields(
                        { name: '🔑 Account', value: `\`${demande.tag}\`` },
                        { name: '👤 Requester', value: `<@${demande.senderId}> (\`${demande.senderId}\`)` },
                        { name: '✔️ Approved by', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` }
                    )
                    .setFooter({ text: "User notified via DM" })
                    .setTimestamp();
                await interaction.update({ 
                    embeds: [acceptedEmbed], components: [] 
                });
            } catch (err) {
                console.error(err);
                interaction.reply({ content: "❌ Erreur fichier.", flags: [ 64 ] });
            }
        } 
        
        else if (action === 'reject') {
            // --- NOTIFICATION MP ---
            if (requester) {
                const rejectEmbed = new EmbedBuilder()
                    .setTitle('❌ Request Rejected')
                    .setColor(0xED4245)
                    .addFields(
                        { name: '🔑 Account', value: `\`${demande.tag}\`` },
                        { name: '👤 Requester', value: `<@${demande.senderId}> (\`${demande.senderId}\`)` },
                        { name: '❌ Rejected by', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` }
                    )
                    .setFooter({ text: "If you believe this is an error, contact staff." })
                    .setTimestamp();
                await requester.send({ embeds: [rejectEmbed] }).catch(() => {});
            }

            client.demandes.delete(targetId);
            const rejectedEmbed = new EmbedBuilder()
                .setTitle('❌ Request Rejected')
                .setColor(0xED4245)
                .addFields(
                    { name: '🔑 Account', value: `\`${demande.tag}\`` },
                    { name: '👤 Requester', value: `<@${demande.senderId}> (\`${demande.senderId}\`)` },
                    { name: '❌ Rejected by', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` }
                )
                .setFooter({ text: "User notified via DM" })
                .setTimestamp();
            await interaction.update({ 
                embeds: [rejectedEmbed], components: [] 
            });
        }
    }
});

client.login(process.env.TOKEN);