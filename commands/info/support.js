const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "support",
  aliases: ['sup', 'server', 'pub', 'invite', 'sakura'],
  description: "Affiche le lien vers le serveur support d'Sakura.",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      const { translate: t } = require('../../utils');

    // --- INTERFACE AESTHETIC ---
    let supportMessage = t('support_title', client.config.language);
    supportMessage += `\n\n`;
    supportMessage += t('support_join_us', client.config.language);

    // Transformation du message de commande
    await message.edit(supportMessage);

      // Suppression automatique après 10 secondes
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 10000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur support: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};