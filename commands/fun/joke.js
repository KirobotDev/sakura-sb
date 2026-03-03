const axios = require("axios");
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: 'joke',
    aliases: ['blague'],
    description: "Affiche une blague aléatoire.",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            try {
                // Petit message de chargement
                await message.edit(t('joke_searching', client.config.language));

                const reponse = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=fr');
                const data = reponse.data;

                if (data.error) {
                    return await message.edit(t('joke_not_found', client.config.language));
                }

                let jokeText = ``;

                if (data.type === 'single') {
                    jokeText += `**${data.joke}**`;
                } else {
                    // Le setup suivi de la chute en spoiler
                    jokeText += `**${data.setup}**\n➜ *||${data.delivery}||*`;
                }

                await message.edit(jokeText);

            } catch (apiErr) {
                logToDiscord(`[${client.user.username}] Erreur JokeAPI : ${apiErr.message}`, 'ERROR');
                
                await message.edit(t('joke_api_error', client.config.language));
                
                // Suppression du message d'erreur après 5 secondes
                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 5000);
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur joke: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};