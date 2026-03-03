const domainPing = require('domain-ping');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "pingdomain",
  aliases: ['pingd', 'pd'],
  description: "Check if the provided url is up or down.",
  usage: "<url>",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      // On ne supprime pas le message ici, car on veut l'éditer
      const domain = args[0];

      if (!domain) {
        return await message.edit(t('pingdomain_need_domain', client.config.language)).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        });
      }

      // Petit message d'attente pendant l'analyse
      await message.edit(t('pingdomain_pinging', client.config.language, { domain: domain }));

      domainPing(domain)
        .then(async (res) => {
          try {
            const logs = JSON.stringify(res, null, 2);
            
            // --- INTERFACE AESTHETIC ---
            let responseText = t('pingdomain_result', client.config.language, { response: logs });

            // Édition du message d'origine
            await message.edit(responseText);

            // Suppression automatique au bout de 10 secondes
            setTimeout(() => {
              message.delete().catch(() => {});
            }, 10000);
          } catch (innerErr) {
            logToDiscord(`[${client.user.username}] Erreur traitement pingdomain: ${innerErr.message}`, 'ERROR');
            message.edit(`❌ **Erreur:** ${innerErr.message}`).catch(() => {});
          }
        })
        .catch(async (error) => {
          try {
            logToDiscord(`[${client.user.username}] Erreur pingdomain: ${error.message}`, 'ERROR');
            const errLogs = JSON.stringify(error, null, 2);
            await message.edit(`❌ **${domain} is DOWN**\n\`\`\`json\n${errLogs}\`\`\``);

            setTimeout(() => {
              message.delete().catch(() => {});
            }, 10000);
          } catch (catchErr) {
            logToDiscord(`[${client.user.username}] Erreur catch pingdomain: ${catchErr.message}`, 'ERROR');
          }
        });
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur pingdomain: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};