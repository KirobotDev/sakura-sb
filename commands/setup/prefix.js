const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "prefix",
  aliases: ['setprefix', 'p'],
  description: "Change ton préfixe de commande.",
  usage: "<nouveau_préfixe>",
  run: async (message, args, command, client) => {
    try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
      
      const fs = require('fs');
      const path = require('path');
      const { translate: t } = require('../../utils');

    if (!args[0]) {
      logToDiscord(`[${client.user.username}] Tentative de changement de préfixe sans argument`, 'ERROR');
      return await message.edit(t('error_invalid_prefix', client.config.language, { prefix: client.config.prefix })).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

    const newPrefix = args[0];

    if (newPrefix.length > 2) {
      logToDiscord(`[${client.user.username}] Tentative de changement de préfixe avec un préfixe trop long: "${newPrefix}"`, 'ERROR');
      return await message.edit(t('error_prefix_too_long', client.config.language)).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

      try {
        const configPath = path.resolve(__dirname, '../../config.json');
        let fullConfig;
        try {
          fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (fileErr) {
          logToDiscord(`[${client.user.username}] Erreur lecture config prefix: ${fileErr.message}`, 'ERROR');
          throw new Error(`Erreur lecture config: ${fileErr.message}`);
        }
      
      const account = fullConfig.accounts.find(a => a.token === client.config.token);
      if (!account) {
        logToDiscord(`[${client.user.username}] Account non rencontré lors du changement de préfixe`, 'ERROR');
        return await message.edit(t('error_prefix_update', client.config.language, { error: 'Account not found' })).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        });
      }

        const oldPrefix = account.prefix;
        account.prefix = newPrefix;
        
        try {
          fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
          logToDiscord(`[${client.user.username}] Config prefix sauvegardée`, 'INFO');
        } catch (saveErr) {
          logToDiscord(`[${client.user.username}] Erreur sauvegarde config prefix: ${saveErr.message}`, 'ERROR');
          throw new Error(`Erreur sauvegarde config: ${saveErr.message}`);
        }
        
        client.config.prefix = newPrefix;

        await message.edit(t('prefix_updated', client.config.language, { old_prefix: oldPrefix, new_prefix: newPrefix }));

        setTimeout(() => {
          message.delete().catch(() => {});
        }, 5000);

      } catch (innerErr) {
        logToDiscord(`[${client.user.username}] Erreur prefix interne: ${innerErr.message}`, 'ERROR');
        await message.edit(t('error_prefix_update', client.config.language, { error: innerErr.message })).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        });
      }
    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur prefix: ${err.message}`, 'ERROR');
      await message.edit(`❌ **Erreur:** ${err.message}`).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }
  }
};
