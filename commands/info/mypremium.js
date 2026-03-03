const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "mypremium",
  aliases: ['premium', 'prem', 'checkpremium'],
  description: "Consulte ton statut premium actuel.",
  usage: "",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      const { translate: t } = require('../../utils');
      const lang = client.config.language;
      
      const isPremium = client.config.is_premium;
      const accountName = client.config.name;
      const username = client.user.username;
      const premiumExpiresAt = client.config.premium_expires_at;

      let statusMsg = t('mypremium_status', lang, { account: accountName, username: username });
      
      if (isPremium) {
        statusMsg += t('mypremium_active', lang);
        
        if (premiumExpiresAt) {
          const expirationDate = new Date(premiumExpiresAt);
          const formattedDate = expirationDate.toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          statusMsg += t('mypremium_expires', lang, { date: formattedDate });
        }
        
        statusMsg += t('mypremium_has_access', lang);
        statusMsg += t('mypremium_commands', lang);
      } else {
        statusMsg += t('mypremium_inactive', lang);
        statusMsg += t('mypremium_blocked', lang);
      }

      statusMsg += `\n**────────────────────**`;

      await message.edit(statusMsg);
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur mypremium: ${err.message}`, 'ERROR');
      return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
    }
  }
};
