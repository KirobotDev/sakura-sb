const { translate: t } = require('../../utils');
const { logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: 'mimic',
    aliases: [],
    description: 'Imite un ou plusieurs utilisateurs',
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            // Access mimic list from client config (ignoring external json writes as per preference)
            if (!client.config.mimic) client.config.mimic = [];

            const action = args[0]?.toLowerCase();
            const target = message.mentions.users.first() || client.users.cache.get(args[0]);

            // FIXED: Added try/catch inside sendTemp to prevent process crash
            const sendTemp = async (text) => {
                try {
                    const msg = await message.edit(text);
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                } catch (editErr) {
                    logToDiscord(`[${client.user.username}] [Mimic] Edit failed: ${editErr.message}`, 'ERROR');
                }
            };

            // --- .mimic list ---
            if (action === "list") {
                if (client.config.mimic.length === 0) return sendTemp(t('mimic_empty', client.config.language));
                const list = client.config.mimic.map(id => `• <@${id}> (\`${id}\`)`).join("\n");
                return sendTemp(t('mimic_list', client.config.language, { username: client.user.username, users_list: list }));
            }

            // --- .mimic clear ---
            if (action === "clear") {
                client.config.mimic = [];
                return sendTemp(t('mimic_cleared', client.config.language));
            }

            // --- Toggle User ---
            if (!target) return sendTemp(t('mimic_need_target', client.config.language));
            if (target.id === client.user.id) return sendTemp(t('mimic_not_self', client.config.language));

            if (client.config.mimic.includes(target.id)) {
                client.config.mimic = client.config.mimic.filter(id => id !== target.id);
                return sendTemp(t('mimic_removed', client.config.language, { user_id: target.id }));
            } else {
                client.config.mimic.push(target.id);
                return sendTemp(t('mimic_added', client.config.language, { user_id: target.id }));
            }

        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur mimic: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};