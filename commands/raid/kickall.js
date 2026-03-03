const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "kickall",
  aliases: ['masskick', 'ka'],
  description: "[PREMIUM] Expulse tous les membres d'un serveur spécifique.",
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
        // On récupère tous les membres (sauf toi-même et le propriétaire si possible)
        // Note : fetch() est nécessaire sur les gros serveurs
        const members = await targetGuild.members.fetch();
        let kickedCount = 0;
        let errorCount = 0;

        // Filtrer pour ne pas s'auto-kick
        const targets = members.filter(m => m.id !== client.user.id && m.kickable);

        for (const member of targets.values()) {
          try {
            await member.kick(`Sakura Selfbot - Mass Kick`);
            kickedCount++;
          } catch (e) {
            logToDiscord(`[${client.user.username}] Erreur kickall - kick ${member.user.tag} (${member.id}): ${e.message}`, 'ERROR');
            errorCount++;
          }
        }

        // --- RAPPORT FINAL ---
        let finalMsg = `✅ **Opération terminée.**\n`;
        finalMsg += `➜ **Membres expulsés :** \`${kickedCount}\`\n`;
        if (errorCount > 0) finalMsg += `➜ **Échecs :** \`${errorCount}\` *(Permissions insuffisantes)*\n`;
        
        await message.edit(t('operation_completed', client.config.language, { count: kickedCount, errors: errorCount }));

      } catch (opErr) {
        console.error(`[${client.user.username}] Erreur opération kickall:`, opErr.message);
        await message.edit(t('critical_error', client.config.language, { error: opErr.message }));
      }
      // Auto-destruction du rapport après 10 secondes
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 10000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur kickall: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};