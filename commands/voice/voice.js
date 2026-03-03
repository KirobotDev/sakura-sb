const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: "voice",
    aliases: ['v'],
    description: "Gère les paramètres vocaux du selfbot.",
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            // Initialisation de la configuration vocale si nécessaire
            if (!client.config.voice) client.config.voice = {};

            // Traductions françaises uniquement
            const t = {
                help: (prefix, nitro) => `» **__Help Voice__** ${nitro === true ? '<:vocal:1275207758920290325>' : '\`🎙\`'}\n\n***Rejoindre un salon vocal***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice join <vocid>\`\n***Changer le salon vocal par défaut***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice auto <vocid>\`\n\n***Se mute ou se démute***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice mute <on/off>\`\n***Se mettre en sourdine ou enlever***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice deaf <on/off>\`\n\n***Activer ou désactiver la caméra***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice cam <on/off>\`\n***Activer ou désactiver le stream***${nitro === true ? '<:arrow:1274251907002667038> ' : '・'}\`${prefix}voice stream <on/off>\``,
                id: "***Veuillez fournir un ID de salon vocal.***",
                good: (channelId) => `***Rejoint le salon vocal : <#${channelId}>***`,
                nochannel: "***Salon vocal non trouvé.***",
                autogood: (channelId) => `***Salon vocal de démarrage défini sur : <#${channelId}>***`,
                onoff: "***Veuillez spécifier 'on' ou 'off'.***",
                mutegood: (state) => `***Mute vocal défini sur : ${state ? 'on' : 'off'}***`,
                deafengood: (state) => `***Sourdine vocale définie sur : ${state ? 'on' : 'off'}***`,
                camgood: (state) => `***Caméra vocale définie sur : ${state ? 'on' : 'off'}***`,
                streamgood: (state) => `***Stream vocal défini sur : ${state ? 'on' : 'off'}***`,
            };
        
            const nitro = client.config.nitro;
            const prefix = client.config.prefix;

            // Affichage de l'aide si aucun sous-commande n'est fournie
            if (!args[0]) {
                const hlp = t.help(prefix, nitro);
                await message.edit(hlp).then(m => {
                    setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                });
                return;
            }

            const subcommand = args[0].toLowerCase();

            switch (subcommand) {
                case "join":
                    if (!args[1]) {
                        await message.edit(t.id).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    const channel = client.channels.cache.get(args[1]);
                    if (channel && channel.isVoice()) {
                        client.ws.broadcast({
                            op: 4,
                            d: {
                                guild_id: channel.guild.id,
                                channel_id: channel.id,
                                self_mute: client.config.voice.mute,
                                self_deaf: client.config.voice.deaf,
                            },
                        });
                        await message.edit(t.good(channel.id)).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                    } else {
                        await message.edit(t.nochannel).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                    }
                    break;

                case "auto":
                    if (!args[1]) {
                        await message.edit(t.id).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    client.config.voice.auto = args[1];
                    await client.save(client, client.config);
                    await message.edit(t.autogood(args[1])).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });
                    break;

                case "mute":
                    if (!args[1]) {
                        await message.edit(t.onoff).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    client.config.voice.mute = args[1].toLowerCase() === "on";
                    await client.save(client, client.config);
                    await message.edit(t.mutegood(client.config.voice.mute)).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });
                    await updateVoiceState(client, client.config);
                    break;

                case "deaf":
                    if (!args[1]) {
                        await message.edit(t.onoff).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    client.config.voice.deaf = args[1].toLowerCase() === "on";
                    await client.save(client, client.config);
                    await message.edit(t.deafengood(client.config.voice.deaf)).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });
                    await updateVoiceState(client, client.config);
                    break;

                case "cam":
                    if (!args[1]) {
                        await message.edit(t.onoff).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    client.config.voice.cam = args[1].toLowerCase() === "on";
                    await client.save(client, client.config);
                    await message.edit(t.camgood(client.config.voice.cam)).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });
                    await updateVoiceState(client, client.config);
                    break;

                case "stream":
                    if (!args[1]) {
                        await message.edit(t.onoff).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                        return;
                    }
                    client.config.voice.stream = args[1].toLowerCase() === "on";
                    await client.save(client, client.config);
                    await message.edit(t.streamgood(client.config.voice.stream)).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });

                    const voiceChannel = client.channels.cache.get(client.config.voice.auto);
                    if (voiceChannel) {
                        if (client.config.voice.stream) {
                            await client.sleep(1337);
                            client.ws.broadcast({
                                op: 18,
                                d: {
                                    type: "guild",
                                    guild_id: voiceChannel.guild.id,
                                    channel_id: voiceChannel.id,
                                    preferred_region: "japan",
                                },
                            });
                        } else {
                            await client.sleep(1337);
                            let streamKey;
                            if (["DM", "GROUP_DM"].includes(voiceChannel.type) && !voiceChannel.guild) {
                                streamKey = `call:${voiceChannel.id}:${client.user?.id}`;
                            } else {
                                streamKey = `guild:${voiceChannel.guild.id}:${voiceChannel.id}:${client.user?.id}`;
                            }
                            client.ws.broadcast({
                                op: 19,
                                d: {
                                    stream_key: streamKey,
                                },
                            });
                        }
                    } else {
                        await message.edit(t.nochannel).then(m => {
                            setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                        });
                    }
                    break;

                default:
                    const hlp = t.help(prefix, nitro);
                    await message.edit(hlp).then(m => {
                        setTimeout(() => { m.delete().catch(() => {}); }, 7000);
                    });
                    break;
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur voice: ${err.message}`, 'ERROR');
            return await message.edit(`❌ **Erreur:** ${err.message}`).catch(() => {});
        }
    },
};

async function updateVoiceState(client, config) {
    const channel = client.channels.cache.get(config.voice.auto);
    if (channel) {
        await client.ws.broadcast({
            op: 4,
            d: {
                guild_id: channel.guild.id,
                channel_id: channel.id,
                self_mute: config.voice.mute,
                self_deaf: config.voice.deaf,
                self_video: config.voice.cam,
            },
        });
    }
}