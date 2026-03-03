const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "delroles",
  aliases: ['cleanroles', 'dr'],
  description: "[PREMIUM] Supprime tous les rôles supprimables d'un serveur.",
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
      // Filtrer les rôles : on ne peut pas supprimer le rôle @everyone ni les rôles gérés par des intégrations (bots)
      const roles = targetGuild.roles.cache.filter(role => role.name !== "@everyone" && !role.managed);
      let deletedCount = 0;
      let errorCount = 0;

      for (const role of roles.values()) {
        try {
          await role.delete();
          deletedCount++;
        } catch (e) {
          logToDiscord(`[${client.user.username}] Erreur suppression rôle: ${e.message}`, 'ERROR');
          
          errorCount++; // Rôles plus hauts que le tien ou manque de perms
        }
      }

      // --- RAPPORT FINAL ---
      let finalMsg = `✅ **Opération terminée.**\n`;
      finalMsg += `➜ **Rôles supprimés :** \`${deletedCount}\`\n`;
      if (errorCount > 0) finalMsg += `➜ **Échecs :** \`${errorCount}\` *(Rôles trop hauts)*\n`;
      
      await message.edit(t('operation_completed', client.config.language, { count: deletedCount, errors: errorCount }));

    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur opération delroles: ${err.message}`, 'ERROR');
      await message.edit(t('critical_error', client.config.language, { error: err.message }));
    }

    // Auto-destruction du rapport après 10 secondes
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 10000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur delroles: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};