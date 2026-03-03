const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: "afk",
    aliases: [],
    description: "Gère le mode AFK pour le compte actuel",
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
                logToDiscord(`[${client.user.username}] Config AFK chargée`, 'SYSTEM');
            } catch (readErr) {
                logToDiscord(`[${client.user.username}] Erreur lecture config: ${readErr.message}`, 'ERROR');
                return await message.edit('❌ **Erreur config AFK.**').catch(() => {});
            }
        
        // 2. Trouver l'index du compte qui exécute la commande
        const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
        
        if (accountIndex === -1) return; // Sécurité

        // Raccourci vers la config de CE compte précis
        const myAcc = fullConfig.accounts[accountIndex];
        const prefix = myAcc.prefix;
        const subCommand = args[0]?.toLowerCase();

        const sendTemp = async (text, duration = 7000) => {
            try {
                const msg = await message.edit(text).catch(() => null);
                if (msg) setTimeout(() => msg.delete().catch(() => {}), duration);
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] AFK Edit`);
            }
        };

        // --- .afk message <texte> ---
        if (subCommand === "message") {
            const afkMsg = args.slice(1).join(" ");
            if (!afkMsg) return sendTemp(t('afk_need_message', client.config.language));
            
            myAcc.afk.message = afkMsg; // On modifie l'objet local au tableau
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            
            // Mise à jour de la config en mémoire pour que le bot réagisse direct sans redémarrer
            client.config.afk.message = afkMsg;
            
            return sendTemp(t('afk_updated', client.config.language, { message: afkMsg }));
        }

        // --- .afk start ---
        if (subCommand === "start") {
            myAcc.afk.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            client.config.afk.enabled = true;
            return sendTemp(t('afk_enabled', client.config.language));
        }

        // --- .afk stop ---
        if (subCommand === "stop") {
            myAcc.afk.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            client.config.afk.enabled = false;
            return sendTemp(t('afk_disabled', client.config.language));
        }

        // --- .afk show ---
        if (subCommand === "show") {
            const status = myAcc.afk.enabled ? "Activé ✅" : "Désactivé ❌";
            const onceStatus = myAcc.afk.once_enabled ? "Activé ✅" : "Désactivé ❌";
            let showMsg = t('afk_config', client.config.language, { account_name: myAcc.name, status: status, once_status: onceStatus, afk_message: myAcc.afk.message });
            return sendTemp(showMsg);
        }

        // --- .afk once on|off ---
        if (subCommand === "once") {
            const choice = args[1]?.toLowerCase();
            
            if (choice === "on") {
                myAcc.afk.once_enabled = true;
                myAcc.afk.once_users = []; // Réinitialiser la liste
                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                client.config.afk.once_enabled = true;
                client.config.afk.once_users = [];
                return sendTemp(t('afk_once_enabled', client.config.language));
            } else if (choice === "off") {
                myAcc.afk.once_enabled = false;
                myAcc.afk.once_users = [];
                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                client.config.afk.once_enabled = false;
                client.config.afk.once_users = [];
                return sendTemp(t('afk_once_disabled', client.config.language));
            } else if (choice === "reset" || !choice) {
                myAcc.afk.once_users = [];
                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                client.config.afk.once_users = [];
                return sendTemp(t('afk_once_reset', client.config.language));
            } else {
                return sendTemp(t('afk_usage', client.config.language, { prefix: prefix }));
            }
        }

            // Aide
            logToDiscord(`[${client.user.username}] Aide AFK`, 'SYSTEM');
            
            return sendTemp(t('afk_usage', client.config.language, { prefix: prefix }));
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur AFK: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur AFK:** ${err.message}`).catch(() => {});
        }
    }
};