const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: "autobump",
    aliases: ['ab', 'abump'],
    description: "Gère les salons d'autobump pour ce compte",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            // 1. Lire le fichier complet
            let fullConfig;
            try {
                fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                logToDiscord(`[${client.user.username}] Config autobump chargée`, 'SYSTEM');
            } catch (readErr) {
                logToDiscord(`[${client.user.username}] Erreur lecture autobump: ${readErr.message}`, 'ERROR');
                return await message.edit('❌ **Erreur config.**').catch(() => {});
            }
        
        // 2. Trouver l'index du compte actuel
        const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
        if (accountIndex === -1) return;

        const myAcc = fullConfig.accounts[accountIndex];
        const subCommand = args[0]?.toLowerCase();

        const sendTemp = async (text, duration = 7000) => {
            try {
                const msg = await message.edit(text).catch(() => null);
                if (msg) setTimeout(() => msg.delete().catch(() => {}), duration);
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] Auto-Bump Edit`);
            }
        };

        // Sauvegarde simplifiée (Fichier + Mémoire vive)
        const save = () => {
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            client.config = myAcc; // Met à jour l'instance actuelle du bot
        };

        // --- .autobump on/off ---
        if (subCommand === "on") {
            myAcc.autobump.enabled = true;
            save();
            return sendTemp(t('autobump_enabled', client.config.language, { account_name: myAcc.name }));
        }
        if (subCommand === "off") {
            myAcc.autobump.enabled = false;
            save();
            return sendTemp(t('autobump_disabled', client.config.language, { account_name: myAcc.name }));
        }

        // --- .autobump add ---
        if (subCommand === "add") {
            if (myAcc.autobump.channels.includes(message.channel.id)) {
                return sendTemp(t('autobump_already_added', client.config.language));
            }
            myAcc.autobump.channels.push(message.channel.id);
            save();
            return sendTemp(t('autobump_channel_added', client.config.language, { channel_name: message.channel.name }));
        }

        // --- .autobump remove ---
        if (subCommand === "remove") {
            myAcc.autobump.channels = myAcc.autobump.channels.filter(id => id !== message.channel.id);
            save();
            return sendTemp(t('autobump_channel_removed', client.config.language, { channel_name: message.channel.name }));
        }

        // --- .autobump list ---
        if (subCommand === "list") {
            const channelsList = myAcc.autobump.channels.length === 0 
                ? t('autobump_no_channels', client.config.language)
                : myAcc.autobump.channels.map((id, index) => `\`${index + 1}.\` <#${id}>`).join('\n');
            
            let list = t('autobump_list', client.config.language, { account_name: myAcc.name, status: myAcc.autobump.enabled ? "Actif" : "Inactif", channels_list: channelsList });
            return sendTemp(list);
        }

            return sendTemp(t('autobump_usage', client.config.language, { prefix: myAcc.prefix }));
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur autobump: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};