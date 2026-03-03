const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "spam",
  aliases: ['s'],
  description: "Envoie un message un nombre défini de fois.",
  usage: "<nombre> <message>",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      
      const { translate: t } = require('../../utils');
    
    // Récupération du préfixe spécifique au compte
    const prefix = client.config.prefix;
    const amount = parseInt(args[0]);
    const text = args.slice(1).join(" ");

    const sendTemp = async (content, delay = 5000) => {
      const msg = await message.edit(content);
      setTimeout(() => msg.delete().catch(() => {}), delay);
    };

    // Vérification des arguments
    if (isNaN(amount) || !text) {
      return await sendTemp(t('spam_usage', client.config.language, { prefix: prefix }));
    }

    // Sécurité : Limite max pour éviter de bloquer l'instance trop longtemps
    if (amount > 50) {
        return await sendTemp("⚠️ **Sécurité :** Limite de 50 messages par commande pour éviter le ban immédiat.");
    }

    // Interface de départ
    await message.edit(`# __Sakura Spam [${client.user.username}]__\n\n🚀 **Spam en cours...**\n➜ **Quantité :** \`${amount}\`\n➜ **Statut :** \`Initialisation\`\n\n**────────────────────**`);

      let sentCount = 0;

      for (let i = 0; i < amount; i++) {
        try {
          await message.channel.send(text);
          sentCount++;

          // Mise à jour visuelle discrète tous les 10 messages
          if (sentCount % 10 === 0) {
              await message.edit(`# __Sakura Spam [${client.user.username}]__\n\n🚀 **Spam en cours...**\n➜ **Progression :** \`${sentCount}\` / \`${amount}\`\n\n**────────────────────**`).catch(() => {});
          }

          // Pause anti-spam (Rate Limit) : 600ms à 900ms aléatoire pour paraître plus "humain"
          const delay = Math.floor(Math.random() * (900 - 600 + 1)) + 600;
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (err) {
          // En cas de Rate Limit Discord (429), on arrête tout
          logToDiscord(`[${client.user.username}] Erreur spam: ${err.message}`, 'ERROR');
          break; 
        }
      }

      // Rapport final
      await message.edit(`# __Sakura Spam Terminé [${client.user.username}]__\n\n✅ **Opération terminée.**\n➜ **Total envoyé :** \`${sentCount}\` / \`${amount}\`\n\n**────────────────────**`);

      // Auto-destruction du rapport après 7 secondes
      setTimeout(() => {
        message.delete().catch(() => {});
      }, 7000);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur spam: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};