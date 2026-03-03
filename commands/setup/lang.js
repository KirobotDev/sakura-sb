const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "lang",
  aliases: ['language', 'setlang'],
  description: "Change votre langue (en/fr)",
  usage: "<en|fr>",
  run: async (message, args, command, client) => {
    const fs = require('fs');
    const path = require('path');
    const { translate: t } = require('../../utils');

            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

    const newLanguage = args[0]?.toLowerCase();

    if (!newLanguage || !['en', 'fr'].includes(newLanguage)) {
      logToDiscord(`[${client.user.username}] Tentative de changement de langue avec une valeur invalide: ${args[0]}`, 'ERROR');
      return await message.edit(t('error_invalid_language', client.config.language)).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }

    try {
      const configPath = path.resolve(__dirname, '../../config.json');
      const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      const account = fullConfig.accounts.find(a => a.token === client.config.token);
      if (!account) {
        logToDiscord(`[${client.user.username}] Account non trouvé lors du changement de langue`, 'ERROR');
        return await message.edit(t('error_language_update', client.config.language, { error: 'Account not found' })).then(m => {
          setTimeout(() => m.delete().catch(() => {}), 5000);
        });
      }

      account.language = newLanguage;
      fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
      
      client.config.language = newLanguage;

      const languageName = newLanguage === 'en' ? 'English' : 'Français';
      await message.edit(t('language_updated', newLanguage, { language: languageName }));

      setTimeout(() => {
        message.delete().catch(() => {});
      }, 5000);

    } catch (err) {
      logToDiscord(`[${client.user.username}] Erreur changement langue: ${err.message}`, 'ERROR');
      await message.edit(t('error_language_update', client.config.language, { error: err.message })).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
    }
  }
};
