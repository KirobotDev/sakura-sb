const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "nuke",
  aliases: ['destroyserver', 'cleanserver'],
  description: "[PREMIUM] Supprime tous les salons d'un serveur spécifique.",
  usage: "<server_ID>",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      
      const { translate: t } = require('../../utils');
    // Vérification du statut premium
    if (!client.config.is_premium) {
      return await message.edit(t('premium_required', client.config.language)).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

    const serverID = args[0];

    if (!serverID) {
      return await message.edit(t('need_server_id', client.config.language)).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

    const targetGuild = client.guilds.cache.get(serverID);

    if (!targetGuild) {
      return await message.edit(t('server_not_found', client.config.language)).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

    // --- INTERFACE DE CONFIRMATION ---
    await message.edit(t('operation_in_progress', client.config.language, { guild_name: targetGuild.name }));

    try {
      // On récupère tous les salons et on les supprime un par un
      const channels = targetGuild.channels.cache;
      let deletedCount = 0;

      for (const channel of channels.values()) {
        try {
          await channel.delete().catch(() => {
            // On ignore les salons qu'on ne peut pas supprimer (manque de perm)
          });
          deletedCount++;
        } catch (chanErr) {
          logToDiscord(`[${client.user.username}] Erreur nuke - suppression canal: ${chanErr.message}`, 'ERROR');
        }
      }

      // Rapport final
      await message.edit(t('operation_completed', client.config.language, { count: deletedCount, errors: 0 }));

    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur opération nuke: ${err.message}`, 'ERROR');
      await message.edit(t('critical_error', client.config.language, { error: err.message }));
    }

    // Suppression du rapport après 10 secondes
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 10000);
    } catch (err) {
        logToDiscord(`[${client.user.username}] Erreur nuke: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};