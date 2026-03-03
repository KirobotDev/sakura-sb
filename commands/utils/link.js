const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

const { translate: t } = require('../../utils');

module.exports = {
    name: "link",
    aliases: ['invites'],
    description: "Gère vos liens d'invitation personnels",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);

            const action = args[0]?.toLowerCase();
            const prefix = client.config.prefix;

            const sendTemp = async (text, duration = 15000) => {
                try {
                    const msg = await message.edit(text).catch(() => null);
                    if (msg) setTimeout(() => msg.delete().catch(() => { }), duration);
                } catch (error) {
                    handleDiscordAPIError(error, `[${client.user.username}] Link Edit`);
                }
            };

            const discordRequest = async (method = 'GET') => {
                while (true) {
                    try {
                        const response = await fetch("https://discord.com/api/v9/users/@me/invites", {
                            method: method,
                            headers: { "Authorization": client.config.token }
                        });

                        if (response.status === 429) {
                            const retryAfter = response.headers.get('retry-after');
                            logToDiscord(`[${client.user.username}] Rate limit link, attente ${retryAfter}s`, 'ERROR');
                            await new Promise(resolve => setTimeout(resolve, parseFloat(retryAfter) * 1000));
                            continue;
                        }
                        return response;
                    } catch (reqErr) {
                        logToDiscord(`[${client.user.username}] Erreur requête link API: ${reqErr.message}`, 'ERROR');
                        throw reqErr;
                    }
                }
            };

            if (action === 'create') {
                const r = await discordRequest('POST');
                if (r.status !== 200) return sendTemp(t('link_create_failed', client.config.language));

                const data = await r.json();
                await message.delete().catch(() => { });
                return message.channel.send(`https://discord.gg/${data.code}`);

            } else if (action === 'view') {
                const r = await discordRequest('GET');
                if (r.status !== 200) return sendTemp(t('link_retrieve_failed', client.config.language));

                const data = await r.json();
                if (data.length === 0) return sendTemp(t('link_no_links', client.config.language));

                const links = data.map(inv =>
                    `• \`discord.gg/${inv.code}\` | Expire : <t:${Math.floor(new Date(inv.expires_at).getTime() / 1000)}:R> | Uses : \`${inv.uses}/${inv.max_uses}\``
                ).join("\n");

                return sendTemp(`# 🔗 __Vos Liens d'Invitation__\n\n${links}`);

            } else if (action === 'revoke') {
                const r = await discordRequest('DELETE');
                if (r.status !== 200) return sendTemp(t('link_revoke_failed', client.config.language));

                return sendTemp(t('link_revoked', client.config.language));

            } else {
                // --- HELP ---
                return sendTemp(t('link_help', client.config.language, { prefix: prefix }));
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur link: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => { });
        }
    }
};