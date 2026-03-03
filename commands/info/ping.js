const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: "ping",
    aliases: ['p'],
    description: "Affiche la latence du selfbot.",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            const { translate: t } = require('../../utils');

        // On édite le message pour montrer le début du calcul
        await message.edit(t('ping_calculating', client.config.language)).then(async (m) => {
            
            // Calcul de la latence
            const ping = m.createdTimestamp - message.createdTimestamp;
            const apiPing = Math.round(client.ws.ping);

            // --- INTERFACE AESTHETIC ---
            let pingMessage = t('ping_result', client.config.language, { ping: ping, api_ping: apiPing });
            pingMessage += `\n`;
            
            // Petit indicateur de statut selon le ping
            let status = t('ping_stable', client.config.language);
            if (ping > 200) status = t('ping_unstable', client.config.language);
            if (ping > 500) status = t('ping_critical', client.config.language);

            pingMessage += t('ping_uptime', client.config.language, { status: status, uptime: Math.floor(client.uptime / 60000) });

            // On édite avec les résultats finaux
            await m.edit(pingMessage);

              // Suppression automatique après 7 secondes
              setTimeout(() => {
                  m.delete().catch(() => {});
              }, 7000);
          });
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur ping: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};