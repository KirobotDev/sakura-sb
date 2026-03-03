const { readdirSync } = require("fs");
const { translate: t } = require('../../utils');
const { sbName, version, logToDiscord, logToDiscordCmd } = require('../../utils.js');

module.exports = {
  name: "help",
  aliases: ['h'],
  usage: "[commande]",
  description: "Affiche l'interface de contrôle de Sakura.",
  run: async (message, args, command, client) => {
    try {
      const cprefix = client.config.prefix;
      const content = message.content.split(' ')[0];
      const cmdName = content.slice(cprefix.length).toLowerCase();
      logToDiscordCmd(cmdName, args.join(' '), client.user.username);

      const prefix = client.config.prefix;
      const lang = client.config.language || 'en';

      if (message.deletable) message.delete().catch(() => {});

      if (!args[0]) {
        let helpText = t('help_title', lang, { username: client.user.username, prefix: prefix }) + `\n\n`;

        const categories = readdirSync("./commands/");

        categories.forEach((dir) => {
          try {
            const commands = readdirSync(`./commands/${dir}/`).filter((file) => file.endsWith(".js"));

            if (commands.length > 0) {
              helpText += t('help_category', lang, { category: dir.toUpperCase() }) + `\n`;

              commands.forEach((file) => {
                const cmdNameFromFile = file.split(".")[0];
                const cmd = client.commands.get(cmdNameFromFile);

                if (cmd) {
                  const descriptionKey = 'cmd_' + cmd.name + '_description';
                  const translatedDesc = t(descriptionKey, lang) ?? cmd.description ?? "N/A";
                  helpText += t('help_command', lang, { prefix: prefix, command_name: cmd.name, description: translatedDesc }) + '\n';
                }
              });
              helpText += `\n`;
            }
          } catch (e) { /* Ignorer les fichiers non-dossiers */ }
        });

        // --- GESTION DU DÉCOUPAGE (SPLIT) ---
        // On découpe par ligne pour éviter de couper un mot en deux
        const chunks = splitMessage(helpText, 1900); 

        for (const chunk of chunks) {
          const sentMsg = await message.channel.send(chunk);
          setTimeout(() => { sentMsg.delete().catch(() => {}); }, 60000);
        }

      } else {
        // --- DÉTAILS DE LA COMMANDE ---
        const search = args[0].toLowerCase();
        const commandObj = client.commands.get(search) ||
                           client.commands.find((c) => c.aliases && c.aliases.includes(search));

        if (!commandObj) return;

        const descriptionKey = 'cmd_' + commandObj.name + '_description';
        const translatedDesc = t(descriptionKey, lang) ?? commandObj.description ?? "N/A";

        let detailMessage = `# __Détails : ${commandObj.name.toUpperCase()}__\n\n` +
                            `➜ **Alias :** \`${commandObj.aliases ? commandObj.aliases.join(', ') : 'Aucun'}\`\n` +
                            `➜ **Usage :** \`${prefix}${commandObj.name} ${commandObj.usage || ''}\`\n` +
                            `➜ **Info :** *${translatedDesc}*\n\n` +
                            `*Compte : ${client.user.username}*`;

        const sentDetail = await message.channel.send(detailMessage);
        setTimeout(() => { sentDetail.delete().catch(() => {}); }, 30000);
      }
    } catch (err) {
      console.error(`[${client.user.username}] Erreur help:`, err.message);
    }
  }
};

/**
 * Utilitaire pour diviser un texte long en plusieurs morceaux
 */
function splitMessage(text, maxLength = 2000) {
  if (text.length <= maxLength) return [text];
  
  const chunks = [];
  let currentChunk = "";
  const lines = text.split("\n");

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += (currentChunk === "" ? "" : "\n") + line;
  }
  
  if (currentChunk !== "") chunks.push(currentChunk);
  return chunks;
}