const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { logToDiscordCmd, logToDiscord, handleDiscordAPIError } = require('../../utils.js');
const { translate: t } = require('../../utils');

module.exports = {
    name: "antigroup",
    aliases: ['ag'],
    description: "Active ou désactive le départ automatique des groupes MP.",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

            // 1. Lire le fichier config.json
            let fullConfig;
            try {
                fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } catch (readErr) {
                logToDiscord(`[${client.user.username}] Erreur lecture config: ${readErr.message}`, 'ERROR');
                return await message.edit('❌ **Erreur lecture config.**').catch(() => {});
            }

            // 2. Trouver l'index du compte actuel
            const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
            if (accountIndex === -1) return;

            const myAcc = fullConfig.accounts[accountIndex];
            const choice = args[0]?.toLowerCase();

            // 3. Logique de bascule (Toggle) ou ON/OFF
            if (choice === "on") {
                myAcc.antigroup = true;
            } else if (choice === "off") {
                myAcc.antigroup = false;
            } else {
                // Toggle automatique si aucun argument
                myAcc.antigroup = !myAcc.antigroup;
            }

            // 4. Sauvegarde dans le fichier
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));

            // 5. Mise à jour de la config en mémoire vive
            client.config.antigroup = myAcc.antigroup;

            const statusEmoji = client.config.antigroup ? "✅" : "❌";
            const statusText = client.config.antigroup ? "activé" : "désactivé";

            try {
                await message.edit(`${statusEmoji} **Anti-Group ${statusText}** pour ce compte.`).catch(() => null);
                setTimeout(() => message.delete().catch(() => {}), 5000);
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] Anti-Group Edit`);
            }

        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur antigroup: ${err.message}`, 'ERROR');
            await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};