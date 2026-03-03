const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils.js');
const { logToDiscordCmd, logToDiscord } = require('../../utils.js');

module.exports = {
    name: "rpc",
    aliases: [],
    description: "Active ou désactive la Rich Presence (RPC).",
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
                return await message.edit(t('rpcconfig_read_config', client.config.language)).catch(() => {});
            }

            // 2. Trouver l'index du compte actuel
            const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
            if (accountIndex === -1) return;

            const myAcc = fullConfig.accounts[accountIndex];
            const choice = args[0]?.toLowerCase();

            // 3. Logique de bascule
            if (choice === "on") {
                myAcc.rpc_enabled = true;
                // On relance le RPC si on active
                if (typeof client.runRPC === 'function') client.runRPC();
            } else if (choice === "off") {
                myAcc.rpc_enabled = false;
                // On retire le RPC immédiatement si on désactive
                await client.user.setPresence({ activities: [], status: client.config.rpc?.status || 'dnd' });
            } else {
                // Toggle si pas d'argument
                myAcc.rpc_enabled = myAcc.rpc_enabled === undefined ? false : !myAcc.rpc_enabled;
            }

            // 4. Sauvegarde
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));

            // 5. Mise à jour mémoire
            client.config.rpc_enabled = myAcc.rpc_enabled;

            const statusText = client.config.rpc_enabled ? t('rpc_toggled_enabled', client.config.language) : t('rpc_toggled_disabled', client.config.language);

            await message.edit(statusText).then(m => {
                setTimeout(() => m.delete().catch(() => {}), 5000);
            });

            // 6. Si on vient d'activer, on relance le RPC pour qu'il s'affiche direct
            if (client.config.rpc_enabled && typeof runRPC === 'function') {
                runRPC();
            }

        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur rpc cmd: ${err.message}`, 'ERROR');
            await message.edit(t('critical_error', client.config.language).replace('{error}', err.message)).catch(() => {});
        }
    }
};