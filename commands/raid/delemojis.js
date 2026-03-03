const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "delemojis",
  aliases: ['cleanemojis', 'de'],
  description: "[PREMIUM] Supprime tous les emojis d'un serveur.",
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

    // --- INTERFACE DE DÉPART ---
    await message.edit(t('operation_in_progress', client.config.language, { guild_name: targetGuild.name }));

    try {
      const emojis = targetGuild.emojis.cache;
      let deletedCount = 0;
      let errorCount = 0;

      if (emojis.size === 0) {
        return await message.edit(t('no_items', client.config.language));
      }

      for (const emoji of emojis.values()) {
        try {
          await emoji.delete();
          deletedCount++;
        } catch (e) {
          logToDiscord(`[${client.user.username}] Erreur suppression emoji: ${e.message}`, 'ERROR');
          errorCount++;
        }
      }

      // --- RAPPORT FINAL ---
      let finalMsg = `✅ **Opération terminée.**\n`;
      finalMsg += `➜ **Emojis supprimés :** \`${deletedCount}\`\n`;
      if (errorCount > 0) finalMsg += `➜ **Échecs :** \`${errorCount}\` *(Permissions manquantes)*\n`;
      
      await message.edit(t('operation_completed', client.config.language, { count: deletedCount, errors: errorCount }));

    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur opération delemojis: ${err.message}`, 'ERROR');
      
      await message.edit(t('critical_error', client.config.language, { error: err.message }));
    }

    // Auto-destruction du rapport après 10 secondes
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 10000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur delemojis: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};