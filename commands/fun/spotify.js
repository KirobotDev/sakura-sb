const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { updateSpotifyData } = require("../../utils"); 
const fs = require('fs');
const path = require('path');
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
    name: 'spotify',
    aliases: ['sp'],
    description: 'Contrôle Spotify pour le compte actuel',
    run: async (message, args, command, client) => {
        try {
            const cprefix = client.config.prefix;
            const content = message.content.split(' ')[0];
            const cmdName = content.slice(cprefix.length).toLowerCase();
            logToDiscordCmd(cmdName, args.join(' '), client.user.username);
            
            const action = args[0]?.toLowerCase();
            const prefix = client.config.prefix;

            const sendTemp = async (text) => {
                await message.edit(text);
                setTimeout(() => message.delete().catch(() => {}), 5000);
            };

            try {
                await updateSpotifyData(client);
            } catch (err) {
                logToDiscord(`[${client.user.username}] Erreur updateSpotifyData: ${err.message}`, 'ERROR');
            }

            if (!client.spotifyToken) {
                return sendTemp(t('spotify_no_connection', client.config.language, { username: client.user.username }));
            }

            const headers = {
                "Authorization": `Bearer ${client.spotifyToken}`,
                "Content-Type": "application/json"
            };

            try {
                switch (action) {
                    case "me":
                        if (!client.spotifyData?.id) return sendTemp(t('spotify_no_id', client.config.language));
                        const meLink = `https://open.spotify.com/user/${client.spotifyData.id}`;
                        await message.delete().catch(() => {});
                        return message.channel.send(meLink);

                    case "play":
                        try {
                            await fetch("https://api.spotify.com/v1/me/player/play", { method: "PUT", headers });
                            return sendTemp(t('spotify_playing', client.config.language));
                        } catch (playErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify play: ${playErr.message}`, 'ERROR');
                            throw playErr;
                        }

                    case "pause":
                        try {
                            await fetch("https://api.spotify.com/v1/me/player/pause", { method: "PUT", headers });
                            return sendTemp(t('spotify_paused', client.config.language));
                        } catch (pauseErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify pause: ${pauseErr.message}`, 'ERROR');
                            throw pauseErr;
                        }

                    case "next":
                        try {
                            await fetch("https://api.spotify.com/v1/me/player/next", { method: "POST", headers });
                            return sendTemp(t('spotify_next', client.config.language));
                        } catch (nextErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify next: ${nextErr.message}`, 'ERROR');
                            throw nextErr;
                        }

                    case "previous":
                        try {
                            await fetch("https://api.spotify.com/v1/me/player/previous", { method: "POST", headers });
                            return sendTemp(t('spotify_previous', client.config.language));
                        } catch (prevErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify previous: ${prevErr.message}`, 'ERROR');
                            throw prevErr;
                        }

                    case "current":
                        try {
                            const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { method: "GET", headers });
                            if (res.status === 204) return sendTemp(t('spotify_no_track', client.config.language));
                            const data = await res.json();
                            await message.delete().catch(() => {});
                            return message.channel.send(data.item.external_urls.spotify);
                        } catch (currErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify current: ${currErr.message}`, 'ERROR');
                            throw currErr;
                        }

                    case "volume":
                        let vol = args[1];
                        if (!vol || vol < 0 || vol > 100) return sendTemp(t('spotify_volume_invalid', client.config.language));
                        try {
                            await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`, { method: "PUT", headers });
                            return sendTemp(t('spotify_volume_set', client.config.language, { volume: vol }));
                        } catch (volErr) {
                            logToDiscord(`[${client.user.username}] Erreur Spotify volume: ${volErr.message}`, 'ERROR');
                            throw volErr;
                        }

                    default:
                        return sendTemp(t('spotify_usage', client.config.language, { prefix: prefix }));
                }
            } catch (apiErr) {
                logToDiscord(`[${client.user.username}] Erreur Spotify API: ${apiErr.message}`, 'ERROR');
                return sendTemp(t('spotify_api_error', client.config.language));
            }
        } catch (err) {
            logToDiscord(`[${client.user.username}] Erreur spotify: ${err.message}`, 'ERROR');
            return await message.edit(` **Erreur:** ${err.message}`).catch(() => {});
        }
    }
};
