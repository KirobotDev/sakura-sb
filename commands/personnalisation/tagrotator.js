const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: 'tagrotator',
    aliases: ['tr'],
    description: 'Fait tourner vos tags sur différents serveurs',
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            // 1. Charger la config complète
            let fullConfig;
            try {
                fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } catch (fileErr) {
                logToDiscord(`[${client.user.username}] Erreur lecture config tagrotator: ${fileErr.message}`, 'ERROR');
                throw new Error(`Erreur lecture config: ${fileErr.message}`);
            }
        
        // 2. Trouver l'index du compte actuel
        const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
        if (accountIndex === -1) return;

        const myAcc = fullConfig.accounts[accountIndex];
        const prefix = myAcc.prefix;
        const action = args[0]?.toLowerCase();

        const sendTemp = async (text, duration = 10000) => {
            try {
                await message.edit(text).catch(() => null);
                setTimeout(() => message.delete().catch(() => {}), duration);
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] TagRotator Edit`);
            }
        };

            // Fonction de sauvegarde (Fichier + Mémoire vive)
            const save = () => {
                try {
                    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                    client.config = myAcc; // Crucial pour que la boucle dans index.js voie le changement
                    logToDiscord(`[${client.user.username}] Config tagrotator sauvegardée`, 'SYSTEM');
                } catch (saveErr) {
                    logToDiscord(`[${client.user.username}] Erreur sauvegarde tagrotator: ${saveErr.message}`, 'ERROR');
                    throw saveErr;
                }
            };

        // --- STATUS ---
        if (action === 'status') {
            const guildList = myAcc.tagrotator.guilds.length > 0
                ? myAcc.tagrotator.guilds.map(id => `• ${client.guilds.cache.get(id)?.name || 'Inconnu'} (\`${id}\`)`).join('\n')
                : t('tagrotator_no_servers', client.config.language);
            
            let msg = t('tagrotator_config', client.config.language, { username: client.user.username, state: myAcc.tagrotator.state ? 'Activé' : 'Désactivé', delay: myAcc.tagrotator.delay });
            msg += `\n` + t('tagrotator_active_servers', client.config.language, { guilds_list: guildList });
            return sendTemp(msg);
        }

        // --- ON / OFF ---
        if (action === 'on' || action === 'off') {
            myAcc.tagrotator.state = (action === 'on');
            save();
            return sendTemp(`✅ **Rotateur de tag ${action === 'on' ? 'activé' : 'désactivé'}** pour ${client.user.username}.`);
        }

        // --- ADD ---
        if (action === 'add') {
            const guildId = args[1] || message.guildId; // Prend l'ID actuel si non fourni
            if (!client.guilds.cache.has(guildId)) return sendTemp(t('tagrotator_invalid_id', client.config.language));
            if (myAcc.tagrotator.guilds.includes(guildId)) return sendTemp(t('tagrotator_already_added', client.config.language));

            myAcc.tagrotator.guilds.push(guildId);
            save();
            return sendTemp(t('tagrotator_server_added', client.config.language, { guild_name: client.guilds.cache.get(guildId).name }));
        }

        // --- REMOVE ---
        if (action === 'remove') {
            const guildId = args[1] || message.guildId;
            myAcc.tagrotator.guilds = myAcc.tagrotator.guilds.filter(id => id !== guildId);
            save();
            return sendTemp(t('tagrotator_server_removed', client.config.language));
        }

        // --- DELAY ---
        if (action === 'delay') {
            const delay = parseInt(args[1]);
            if (isNaN(delay) || delay < 10) return sendTemp(t('tagrotator_min_delay', client.config.language));
            
            myAcc.tagrotator.delay = delay;
            save();
            return sendTemp(t('tagrotator_delay_set', client.config.language, { delay: delay }));
        }

            // --- HELP ---
            const help = `# 🏷️ __Sakura TagRotator Help__\n\n` +
                         `➜ \`${prefix}tr status\` : Voir la config\n` +
                         `➜ \`${prefix}tr on/off\` : Activer/Désactiver\n` +
                         `➜ \`${prefix}tr delay <sec>\` : Temps de rotation\n` +
                         `➜ \`${prefix}tr add [id]\` : Ajouter (id ou salon actuel)\n` +
                         `➜ \`${prefix}tr remove [id]\` : Retirer (id ou salon actuel)\n`;
            return sendTemp(help);
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur tagrotator: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};