const fs = require('fs');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: "list",
    aliases: ['server-number', 'friend-number', 'mp-list', 'ml'],
    description: "Affiche les statistiques et listes du compte actuel",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

        const sendTemp = async (text) => {
            const msg = await message.edit(text);
            setTimeout(() => msg.delete().catch(() => {}), 20000); // 20s
        };

        // --- 1. MENU GÉNÉRAL ---
        if (cmdName === "list") {
            return sendTemp(t('lists_menu', client.config.language, { username: client.user.username, prefix: prefix }));
        }

        // --- 2. STATISTIQUES CHIFFRÉES ---
        if (cmdName === "server-number") {
            return sendTemp(t('lists_guild_count', client.config.language, { username: client.user.username, guild_count: client.guilds.cache.size }));
        }

        if (cmdName === "friend-number") {
            const friends = client.relationships.cache.filter(r => r === 1).size;
            return sendTemp(t('lists_friend_count', client.config.language, { username: client.user.username, friends_count: friends }));
        }

        // --- 3. MP-LIST ---
        if (cmdName === "mp-list" || cmdName === "ml") {
            const dms = client.channels.cache
                .filter(c => c.type === 'DM')
                .sort((a, b) => (b.lastMessageId || 0) - (a.lastMessageId || 0))
                .map(c => {
                    const target = c.recipient;
                    const displayName = target ? (target.globalName || target.username) : "Inconnu";
                    return `• **${displayName}** ➜ \`${c.id}\``;
                })
                .slice(0, 15)
                .join('\n');

            return sendTemp(t('lists_dms', client.config.language, { username: client.user.username, dms_list: dms || t('lists_no_dms', client.config.language) }));
        }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur list: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};