const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
  name: "dmall",
  aliases: ['massdm', 'mdm'],
  description: "[PREMIUM] Envoie un message privé à tous les membres d'un serveur.",
  usage: "<server_ID> <message>",
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
    
    // Récupération de la config du compte et des réglages globaux
    const myAcc = client.config;
    const globalSettings = client.globalSettings || { global_delay_multiplier: 1 };
    const prefix = myAcc.prefix;

    const serverID = args[0];
    const text = args.slice(1).join(" ");

    // Fonction utilitaire pour éditer/supprimer
    const sendTemp = async (content, delay = 5000) => {
      const msg = await message.edit(content);
      setTimeout(() => msg.delete().catch(() => {}), delay);
    };

    if (!serverID || !text) {
      return await sendTemp(t('dmall_usage', client.config.language, { prefix: prefix }));
    }

    const targetGuild = client.guilds.cache.get(serverID);

    if (!targetGuild) {
      return await sendTemp(t('server_not_found', client.config.language));
    }

    // --- INTERFACE DE DÉPART ---
    await message.edit(t('operation_in_progress', client.config.language, { guild_name: targetGuild.name }));

    try {
      // Fetch des membres pour les gros serveurs
      const members = await targetGuild.members.fetch();
      const targets = members.filter(m => !m.user.bot && m.id !== client.user.id);
      
      let successCount = 0;
      let errorCount = 0;

      for (const member of targets.values()) {
        try {
          await member.send(text);
          successCount++;
          
          // Mise à jour visuelle du progrès
          if (successCount % 5 === 0 || successCount === targets.size) {
            await message.edit(`# __Sakura Mass DM en cours...__\n\n👤 **Compte :** \`${client.user.username}\`\n🟢 **Envoi :** \`${successCount}\` / \`${targets.size}\`\n🔴 **Échecs :** \`${errorCount}\`\n\n**────────────────────**`).catch(() => {});
          }

          // --- GESTION DU TEMPS (ANTI-SPAM) ---
          // Rate limit : 45 secondes entre chaque message
          const DMALL_DELAY = 45000; // 45 secondes
          await new Promise(resolve => setTimeout(resolve, DMALL_DELAY));

        } catch (e) {
          // Gestion intelligente des erreurs Discord
          if (e.code !== undefined) {
            // C'est une erreur DiscordAPIError
            handleDiscordAPIError(e, `[${client.user.username}] DMALL to ${member.user.tag}`);
          } else {
            // Erreur générale
            logToDiscord(`[${client.user.username}] Erreur dmall - dm à ${member.user.tag} (${member.id}): ${e.message}`, 'ERROR');
          }
          
          errorCount++;
          
          // Si on est rate-limit (Code 429), on fait une pause plus longue
          if (e.httpStatus === 429 || e.status === 429) {
            logToDiscord(`[${client.user.username}] Rate limit DM, attente 60s`, 'ERROR');
            await new Promise(resolve => setTimeout(resolve, 60000)); 
          }
        }
      }

      // --- RAPPORT FINAL ---
      let finalMsg = `✅ **Campagne terminée.**\n`;
      finalMsg += `➜ **Messages envoyés :** \`${successCount}\`\n`;
      finalMsg += `➜ **Messages bloqués :** \`${errorCount}\`\n`;
      
      await message.edit(t('operation_completed', client.config.language, { count: successCount, errors: errorCount }));

    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur opération dmall: ${err.message}`, 'ERROR');
      await message.edit(t('critical_error', client.config.language, { error: err.message }));
    }

    // Auto-destruction après 15 secondes
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 15000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur dmall: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};