const { translate: t } = require('../../utils');
const { logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: "snipe",
    aliases: ['s'],
    description: "Affiche les messages supprimés (In-Memory)",
    run: async (message, args, command, client) => {
        const cprefix = client.config.prefix;
        const content = message.content.split(' ')[0];
        const cmdName = content.slice(cprefix.length).toLowerCase();
        logToDiscordCmd(cmdName, args.join(' '), client.user.username);

        // Robust sendTemp with error handling to prevent crashing
        const sendTemp = async (text) => {
            try {
                const msg = await message.edit(text);
                setTimeout(() => msg.delete().catch(() => {}), 20000);
            } catch (err) {
                console.error(`[Snipe Error] Could not edit message: ${err.message}`);
                // If edit fails, we try to send a new message as a fallback
                // message.channel.send(text).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            }
        };

        // Use client memory instead of snipes.json
        if (!client.snipes) client.snipes = {};
        const snipes = client.snipes[message.channel.id];

        if (!snipes || snipes.length === 0) {
            return sendTemp(`❌ **Aucun message supprimé pour ce salon.**`);
        }

        const index = parseInt(args[0]) - 1;

        // Mode détail : >snipe 1
        if (!isNaN(index)) {
            if (index < 0 || index >= snipes.length) {
                return sendTemp(`❌ **Index invalide (1-${snipes.length}).**`);
            }

            const s = snipes[index];
            const timestamp = Math.floor(s.time / 1000);
            
            return sendTemp(t('snipe_detail', client.config.language, { 
                author: s.authorTag, 
                time: timestamp, 
                content: s.content || '*[Vide/Image]*' 
            }));
        }

        // Mode liste : >snipe
        let snipesList = '';
        snipes.slice(0, 5).forEach((s, i) => {
            const time = Math.floor(s.time / 1000);
            const preview = s.content ? (s.content.substring(0, 30) + "...") : "🖼️ Image/Attachment";
            snipesList += `**${i + 1}.** \`${s.authorTag}\` : ${preview} (<t:${time}:R>)\n`;
        });

        return sendTemp(t('snipe_recent', client.config.language, { 
            content: snipesList, 
            prefix: client.config.prefix 
        }));
    }
};