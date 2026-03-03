const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: 'whois',
    aliases: ['userinfo', 'user', 'ui'],
    description: "Affiche les informations d'un utilisateur.",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            const { translate: t } = require('../../utils');
                // Détection de l'utilisateur (mentionné, ID ou soi-même)
            const user = message.mentions.users.first() || 
                     client.users.cache.get(args[0]) || 
                     message.author;

        // Récupération du membre dans le serveur (si applicable)
        let member = null;
        if (message.guild) {
            member = message.guild.members.cache.get(user.id);
        }

        // --- INTERFACE AESTHETIC ---
        let whoisMessage = t('whois_info', client.config.language, { 
            user_tag: user.tag, 
            user_id: user.id, 
            is_bot: user.bot ? 'Oui' : 'Non',
            creation_date: user.createdAt.toLocaleDateString(),
            join_date: member ? (member.joinedAt ? member.joinedAt.toLocaleDateString() : 'Inconnue') : 'N/A'
        });
        
        // Edition du message
        await message.edit(whoisMessage);

            // Suppression automatique après 10 secondes
            setTimeout(() => {
                message.delete().catch(() => {});
            }, 10000);
        } catch (err) {
            console.error(`[${client.user.username}] Erreur whois:`, err.message);
            return await message.edit(`❌ **Erreur Whois:** ${err.message}`).catch(() => {});
        }
    }
};