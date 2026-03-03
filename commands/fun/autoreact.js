const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: 'autoreact',
    aliases: ['ar'],
    description: 'Réagit automatiquement aux messages d\'un utilisateur',
    usage: 'add <@user> <emoji> | remove <@user> | list | clear',
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            let fullConfig;
            try {
                fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                logToDiscord(`[${client.user.username}] Config autoreact chargée`, 'SYSTEM');
            } catch (readErr) {
                logToDiscord(`[${client.user.username}] Erreur lecture autoreact: ${readErr.message}`, 'ERROR');
                return await message.edit('❌ **Erreur config.**').catch(() => {});
            }
        const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
        if (accountIndex === -1) return;

        const myAcc = fullConfig.accounts[accountIndex];
        if (!myAcc.autoreact) myAcc.autoreact = []; // Structure : [{id: "...", emoji: "..."}]

        const action = args[0]?.toLowerCase();
                
        const sendTemp = async (text) => {
            try {
                // Tentative d'édition du message
                const msg = await message.edit(text);

                // Suppression après 5 secondes avec sécurité
                setTimeout(() => {
                    msg.delete().catch(() => {
                        // On ignore l'erreur si le message est déjà supprimé
                    });
                }, 5000);
            } catch (err) {
                // Si l'édition échoue (Permissions, message trop vieux, etc.)
                // On log l'erreur sans faire crash le bot
                console.error(`[Erreur sendTemp] Impossible d'éditer le message : ${err.message}`);
                
                // Optionnel : Envoyer un nouveau message à la place si l'edit échoue
                // message.channel.send(text).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            }
        };

        const save = () => {
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            client.config.autoreact = myAcc.autoreact;
        };

        // --- .ar list ---
        if (action === "list") {
            if (myAcc.autoreact.length === 0) return sendTemp(t('autoreact_none', client.config.language));
            const list = myAcc.autoreact.map(target => `• <@${target.id}> ➜ ${target.emoji}`).join("\n");
            return sendTemp(t('autoreact_list', client.config.language, { username: client.user.username, reactions_list: list }));
        }

        // --- .ar clear ---
        if (action === "clear") {
            myAcc.autoreact = [];
            save();
            return sendTemp(t('autoreact_cleared', client.config.language));
        }

        // --- .ar add <user> <emoji> ---
        if (action === "add" || !action) {
            const target = message.mentions.users.first() || client.users.cache.get(args[1]);
            const emoji = args[2] || args[1]; // Gère si l'utilisateur met direct l'emoji après la mention

            if (!target || !emoji) return sendTemp(t('autoreact_usage_add', client.config.language, { prefix: client.config.prefix }));
            
            // On vérifie si l'utilisateur est déjà dans la liste pour mettre à jour l'émoji
            const existingIndex = myAcc.autoreact.findIndex(t => t.id === target.id);
            if (existingIndex !== -1) {
                myAcc.autoreact[existingIndex].emoji = emoji;
                save();
                return sendTemp(t('autoreact_emoji_updated', client.config.language, { user_id: target.id, emoji: emoji }));
            } else {
                myAcc.autoreact.push({ id: target.id, emoji: emoji });
                save();
                return sendTemp(t('autoreact_enabled', client.config.language, { user_id: target.id, emoji: emoji }));
            }
        }

        // --- .ar remove <user> ---
        if (action === "remove") {
            const target = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!target) return sendTemp(t('autoreact_need_mention', client.config.language));
            
            myAcc.autoreact = myAcc.autoreact.filter(t => t.id !== target.id);
            save();
            return sendTemp(t('autoreact_removed', client.config.language, { user_id: target.id }));
        }
    } catch (err) {
        logToDiscord(`[${client.user.username}] Erreur autoreact: ${err.message}`, 'ERROR');
        return await message.edit('❌ **Une erreur est survenue.**').catch(() => {});
    }
    }
};