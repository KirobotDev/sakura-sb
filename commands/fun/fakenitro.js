const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: "fakenitro",
    aliases: ['fnitro', 'nitro'],
    description: "Génère un faux lien Nitro (troll)",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            // Génération d'un code aléatoire de 16 caractères (standard Discord)
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 16; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const nitroLink = `https://discord.gift/${code}`;

            // On supprime le message de commande et on envoie juste le lien
            // Discord générera automatiquement l'aperçu (embed) du cadeau Nitro
            await message.delete().catch(() => {});
            return message.channel.send(nitroLink);
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur fakenitro: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};