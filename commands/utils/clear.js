const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

const { translate: t } = require('../../utils');

module.exports = {
  name: "clear",
  aliases: ['cl', 'purge', 'delete'],
  description: "Supprime tes propres messages récents dans le salon.",
  usage: "[nombre]",
  run: async (message, args, command, client) => {
    try {
      const cprefix = client.config.prefix;
      const content = message.content.split(' ')[0];
      const cmdName = content.slice(cprefix.length).toLowerCase();
      logToDiscordCmd(cmdName, args.join(' '), client.user.username);

      // On ne supprime pas le message de commande tout de suite pour l'éditer
      const amount = args[0] ? parseInt(args[0]) : 100; // 100 par défaut si rien n'est précisé

      if (isNaN(amount)) {
        logToDiscord(`[${client.user.username}] Clear: Argument invalide`, 'ERROR');
        try {
          await message.edit(t('clear_invalid', client.config.language)).catch(() => null);
          setTimeout(() => message.delete().catch(() => { }), 5000);
        } catch (error) {
          handleDiscordAPIError(error, `[${client.user.username}] Clear Invalid`);
        }
        return;
      }

      try {
        await message.edit(t('clear_help', client.config.language, { amount: amount })).catch(() => null);
      } catch (error) {
        handleDiscordAPIError(error, `[${client.user.username}] Clear Help`);
      }

      try {
        // Récupérer les messages du salon
        const messages = await message.channel.messages.fetch({ limit: 100 });

        // Filtrer pour ne garder QUE tes messages (ceux du selfbot)
        // On exclut le message de confirmation actuel pour le supprimer à la fin
        const userMessages = messages.filter(m => m.author.id === client.user.id && m.id !== message.id);

        let deletedCount = 0;
        const toDelete = Array.from(userMessages.values()).slice(0, amount);

        for (const msg of toDelete) {
          await msg.delete().catch(() => { });
          deletedCount++;
          // Petite pause pour éviter le flag de suppression massive
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        // Rapport final
        try {
          await message.edit(t('clear_completed', client.config.language, { count: deletedCount })).catch(() => null);
        } catch (error) {
          handleDiscordAPIError(error, `[${client.user.username}] Clear Completed`);
        }

      } catch (err) {
        logToDiscord(`[${client.user.username}] Erreur clear: ${err.message}`, 'ERROR');
        try {
          await message.edit(t('clear_error', client.config.language, { error: err.message })).catch(() => null);
        } catch (error) {
          handleDiscordAPIError(error, `[${client.user.username}] Clear Error Message`);
        }
      }

      // Auto-destruction du rapport après 5 secondes pour un salon clean
      setTimeout(() => {
        message.delete().catch(() => { });
      }, 5000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur clear: ${err.message}`, 'ERROR');
      return await message.edit('❌ **Une erreur est survenue.**').catch(() => { });
    }
  }
};
