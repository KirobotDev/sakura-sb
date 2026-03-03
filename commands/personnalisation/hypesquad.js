const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: "hypesquad",
    aliases: ['hype'],
    description: "Change votre maison HypeSquad",
    run: async (message, args, command, client) => {
        try {
            const prefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(prefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            const { translate: t } = require('../../utils');
            const house = args[0]?.toLowerCase();

        const housesMap = {
            "leave": 0, // Dans l'API, 0 retire la maison
            "bravery": 1,
            "brilliance": 2,
            "balance": 3
        };

        const sendTemp = async (text, duration = 10000) => {
            try {
                const msg = await message.edit(text).catch(() => null);
                if (msg) setTimeout(() => msg.delete().catch(() => {}), duration);
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] HypeSquad Edit`);
            }
        };

            // Si l'utilisateur ne donne pas d'argument ou un argument invalide
            if (!house || !housesMap.hasOwnProperty(house)) {
                return sendTemp(
                    `❌ ` + t('hypesquad_invalid', client.config.language, { prefix: prefix })
                );
            }

            try {
                // Utilisation de la méthode native de discord.js-selfbot-v13
                // Note: Si 'setHypeSquad' n'existe pas, on peut utiliser client.user.setSettings({ flags: ... })
                // Mais généralement, setHypeSquad est bien supporté.
                await client.user.setHypeSquad(housesMap[house]);

                const statusMsg = house === "leave" 
                    ? t('hypesquad_left', client.config.language)
                    : t('hypesquad_joined', client.config.language, { house: house.charAt(0).toUpperCase() + house.slice(1) });

                return sendTemp(`✅ **Succès :** ${statusMsg}`);

            } catch (settingErr) {
                logToDiscord(`[${client.user.username}] Erreur setHypeSquad: ${settingErr.message}`, 'ERROR');
                return sendTemp(t('hypesquad_error', client.config.language));
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur hypesquad: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};