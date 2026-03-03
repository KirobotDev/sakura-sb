const fs = require('fs');
const path = require('path');
const configPath = path.resolve(__dirname, '../../config.json');
const { translate: t } = require('../../utils.js');
const { logToDiscordCmd, logToDiscord } = require('../../utils.js');

module.exports = {
    name: "rpcconfig",
    aliases: ['rpcc', 'setrpc'],
    description: "Configure, affiche ou réinitialise le RPC.",
    usage: "<option/show/reset> [texte]",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

            let fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const accountIndex = fullConfig.accounts.findIndex(acc => acc.token === client.token);
            if (accountIndex === -1) return;
            const myAcc = fullConfig.accounts[accountIndex];

            const option = args[0]?.toLowerCase();
            const lang = client.config.language;

            // --- OPTION RESET ---
            if (option === "reset") {
                myAcc.rpc = {}; // Vide l'objet RPC
                delete myAcc.largeimage; // Supprime les images personnalisées
                delete myAcc.smallimage;
                
                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                client.config.rpc = {};
                delete client.config.largeimage;
                delete client.config.smallimage;

                if (typeof client.runRPC === 'function') client.runRPC();
                return await message.edit(t('rpcconfig_reset', lang)).then(m => {
                    setTimeout(() => m.delete().catch(() => {}), 5000);
                });
            }

            // --- OPTION SHOW ---
            if (!option || option === "show") {
                const rpc = myAcc.rpc || {};
                const defaultText = lang === 'fr' ? 'Par défaut' : 'Default';
                const sakuraName = lang === 'fr' ? 'Sakura $B' : 'Sakura $B';
                const playingText = lang === 'fr' ? 'EN JEUX' : 'PLAYING';
                
                const lines = [
                    t('rpcconfig_show', lang).replace('{username}', client.user.username),
                    t('rpcconfig_name', lang).replace('{name}', rpc.name || sakuraName),
                    t('rpcconfig_type', lang).replace('{type}', rpc.type || playingText),
                    t('rpcconfig_details', lang).replace('{details}', rpc.details || defaultText),
                    t('rpcconfig_state', lang).replace('{state}', rpc.state || defaultText),
                    t('rpcconfig_largeimage', lang).replace('{image_status}', myAcc.largeimage ? t('rpcconfig_custom_image', lang) : t('rpcconfig_default_image', lang)),
                    t('rpcconfig_status', lang).replace('{status}', myAcc.rpc_enabled !== false ? "🟢 " + (lang === 'fr' ? 'Activé' : 'Enabled') : "🔴 " + (lang === 'fr' ? 'Désactivé' : 'Disabled'))
                ];
                return await message.edit(lines.join('\n')).then(m => {
                    setTimeout(() => m.delete().catch(() => {}), 15000);
                });
            }

            // --- MODIFICATION ---
            const value = args.slice(1).join(" ");
            if (!value) return await message.edit(t('rpcconfig_no_value', lang));

            if ((option === "largeimage" || option === "smallimage") && !value.startsWith("https://")) {
                return await message.edit(t('rpcconfig_image_invalid_url', lang));
            }

            if (!myAcc.rpc) myAcc.rpc = {};
            switch (option) {
                case 'name': myAcc.rpc.name = value; break;
                case 'type': myAcc.rpc.type = value.toUpperCase(); break;
                case 'state': myAcc.rpc.state = value; break;
                case 'details': myAcc.rpc.details = value; break;
                case 'largeimage': myAcc.largeimage = value; break;
                case 'smallimage': myAcc.smallimage = value; break;
                default: return await message.edit(t('rpcconfig_invalid_option', lang).replace('{option}', option));
            }

            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
            client.config.rpc = myAcc.rpc;
            client.config.largeimage = myAcc.largeimage;
            client.config.smallimage = myAcc.smallimage;

            await message.edit(t('rpcconfig_updated', lang).replace('{option}', option));
            if (typeof client.runRPC === 'function' && client.config.rpc_enabled !== false) client.runRPC();;

        } catch (err) {
            await message.edit(t('rpcconfig_parse_error', client.config.language).replace('{error}', err.message));
        }
    }
};