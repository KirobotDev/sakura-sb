const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd, handleDiscordAPIError } = require('../../utils.js');

module.exports = {
    name: "readall",
    aliases: ['rall', 'markallread'],
    description: "Marque tous les serveurs comme lus",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            const sendTemp = async (text, duration = 10000) => {
                try {
                    const msg = await message.edit(text).catch(() => null);
                    if (msg) setTimeout(() => msg.delete().catch(() => {}), duration);
                } catch (error) {
                    handleDiscordAPIError(error, `[${client.user.username}] ReadAll Edit`);
                }
            };

            try {
                await message.edit(t('readall_cleaning', client.config.language)).catch(() => {});
            } catch (error) {
                handleDiscordAPIError(error, `[${client.user.username}] ReadAll Cleaning Message`);
            }

            const readStates = [];

            client.guilds.cache.forEach(guild => {
                guild.channels.cache.forEach(channel => {
                    if (
                        ["GUILD_TEXT", "GUILD_NEWS", "GUILD_PUBLIC_THREAD", "GUILD_PRIVATE_THREAD", "GUILD_FORUM"].includes(channel.type) &&
                        channel.lastMessageId
                    ) {
                        readStates.push({
                            channel_id: channel.id,
                            message_id: channel.lastMessageId,
                            read_state_type: 0
                        });
                    }
                });
            });

            if (readStates.length === 0) {
                return sendTemp(t('readall_no_unread', client.config.language));
            }

            const chunks = [];
            for (let i = 0; i < readStates.length; i += 100) {
                chunks.push(readStates.slice(i, i + 100));
            }

            try {
                for (const chunk of chunks) {
                    let success = false;
                    while (!success) {
                        try {
                            const r = await fetch("https://discord.com/api/v9/read-states/ack-bulk", {
                                method: "POST",
                                headers: {
                                    "Authorization": client.config.token,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ read_states: chunk })
                            });

                            if (r.status === 429) {
                                const data = await r.json();
                                console.warn(`[${client.user.username}] Rate limit readall, attente ${data.retry_after}s`);
                                await new Promise(resolve => setTimeout(resolve, data.retry_after * 1000));
                                continue;
                            }

                            if (r.status === 202 || r.status === 200 || r.status === 204) {
                                success = true;
                            } else {
                                throw new Error(`Erreur API readall: ${r.status}`);
                            }
                        } catch (fetchErr) {
                            console.error(`[${client.user.username}] Erreur fetch readall:`, fetchErr.message);
                            throw fetchErr;
                        }
                    }
                }

                return sendTemp(t('readall_completed', client.config.language));
                
            } catch (apiErr) {
                console.error(`[${client.user.username}] Erreur API ReadAll:`, apiErr.message);
                return sendTemp(t('readall_error', client.config.language));
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur readall: ${err.message}`, 'ERROR');
            return await message.edit(` **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};
