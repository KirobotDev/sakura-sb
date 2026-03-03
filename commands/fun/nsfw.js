const axios = require('axios');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: "nsfw",
    aliases: [
        '4k', 'anal', 'ass', 'boobs', 'gonewild', 'hanal', 'hass', 
        'hboobs', 'hentai', 'hkitsune', 'hmidriff', 'hneko', 'holo', 
        'hthigh', 'kemonomimi', 'neko', 'paizuri', 'pgif', 'pussy', 
        'tentacle', 'thigh', 'yaoi'
    ],
    description: "Menu NSFW ou envoi d'image pornographique",
    run: async (message, args, command, client) => {
        try {
            const prefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(prefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

        // 1. MENU SI LE NOM DE BASE EST UTILISÉ
        if (cmdName === "nsfw") {
            let menu = `# 🔞 __Sakura NSFW Menu [${client.user.username}]__\n\n`;
            menu += `➜ \`${prefix}4k\` ☆ \`${prefix}anal\` ☆ \`${prefix}ass\`\n`;
            menu += `➜ \`${prefix}boobs\` ☆ \`${prefix}gonewild\` ☆ \`${prefix}pussy\`\n`;
            menu += `➜ \`${prefix}pgif\` ☆ \`${prefix}thigh\` ☆ \`${prefix}paizuri\`\n\n`;
            
            menu += `**🎨 HENTAI & ANIME**\n`;
            menu += `☆ \`${prefix}hentai\` ☆ \`${prefix}hanal\` ☆ \`${prefix}hass\`\n`;
            menu += `☆ \`${prefix}hboobs\` ☆ \`${prefix}hkitsune\` ☆ \`${prefix}hmidriff\`\n`;
            menu += `☆ \`${prefix}hneko\` ☆ \`${prefix}holo\` ☆ \`${prefix}hthigh\`\n`;
            menu += `☆ \`${prefix}kemonomimi\` ☆ \`${prefix}neko\` ☆ \`${prefix}tentacle\`\n`;
            menu += `☆ \`${prefix}yaoi\`\n\n`;
            
            menu += `**────────────────────**`;
            return message.edit(menu);
        }

        // 2. ENVOI DE L'IMAGE
        try {
            await message.edit(t('nsfw_searching', client.config.language, { category: cmdName }));

            let imageUrl = "";

            // --- STRATÉGIE DE SECOURS (API MULTIPLES) ---
            
            // Test avec NekoBot
            const nekoCompatible = ['4k', 'anal', 'ass', 'boobs', 'gonewild', 'pgif', 'pussy', 'thigh', 'paizuri', 'hentai'];
            if (nekoCompatible.includes(cmdName)) {
                const res = await axios.get(`https://nekobot.xyz/api/image?type=${cmdName}`).catch(() => null);
                if (res) imageUrl = res.data.message;
            }

            // Si toujours rien, on utilise Nekos.life
            if (!imageUrl) {
                let nekosCategory = cmdName;
                if (cmdName === 'hanal') nekosCategory = 'anal';
                if (cmdName === 'hneko') nekosCategory = 'nsfw_neko_gif';
                if (cmdName === 'hboobs') nekosCategory = 'boobs';

                const res = await axios.get(`https://nekos.life/api/v2/img/${nekosCategory}`).catch(() => null);
                if (res) imageUrl = res.data.url;
            }

            if (!imageUrl) {
                return message.edit(t('nsfw_category_unavailable', client.config.language, { category: cmdName }));
            }

            // On supprime le message d'attente et on envoie l'image brute
            await message.delete().catch(() => {});
            return message.channel.send(imageUrl);

        } catch (error) {
            logToDiscord(`[${client.user.username}] Erreur NSFW: ${error.message}`, 'ERROR');
            
            return message.edit(t('nsfw_servers_overloaded', client.config.language));
        }
    } catch (error) {
        logToDiscord(`[${client.user.username}] Erreur NSFW (outer): ${error.message}`, 'ERROR');
        return message.edit(t('nsfw_servers_overloaded', client.config.language));
    }
    }
};