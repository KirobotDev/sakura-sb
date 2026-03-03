const superagent = require('superagent');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "iplookup",
  aliases: ['ipl', 'ip'],
  usage: "<adresse ip>",
  description: "Récupère les informations d'une adresse IP.",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      // Utilisation du préfixe spécifique au compte actuel
      const prefix = client.config.prefix;
      const ip = args[0];

      // Fonction utilitaire pour envoyer un message temporaire
      const sendTemp = async (text, delay = 5000) => {
        const msg = await message.edit(text);
        setTimeout(() => msg.delete().catch(() => {}), delay);
      };

      if (!ip) {
        return await sendTemp(t('iplookup_need_ip', client.config.language, { prefix: prefix }));
      }

      try {
        const response = await superagent.get(`http://ip-api.com/json/${ip}?fields=66846719`);
        const data = response.body;

      if (data.status === 'fail') {
        let raison = t('iplookup_invalid', client.config.language);
        
        // Détection IP locale (ex: 192.168.x.x)
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1') {
          raison = t('iplookup_private', client.config.language);
        }

        return await sendTemp(`❌ **Erreur :** ${raison}`, 7000);
      }

      // --- INTERFACE AESTHETIC ---
      let ipMessage = t('iplookup_result', client.config.language, { 
          username: client.user.username,
          ip: data.query,
          country: data.country,
          city: data.city
      });

        // Édition du message avec le résultat
        await message.edit(ipMessage);

        // Suppression automatique après 10s pour nettoyer
        setTimeout(() => message.delete().catch(() => {}), 10000);

      } catch (apiErr) {
        logToDiscord(`[${client.user.username}] Erreur IP API: ${apiErr.message}`, 'ERROR');
        return await sendTemp("⚠️ **Une erreur est survenue lors de la recherche.**");
      }
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur iplookup: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};