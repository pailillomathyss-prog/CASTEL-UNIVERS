const { EmbedBuilder } = require('discord.js');
const { getGuild } = require('../database/db');

async function sendLog(guild, { title, description, color = 0x4169E1 }) {
  try {
    const guildData = getGuild(guild.id);
    if (!guildData.log_channel_id) return;

    const logChannel = guild.channels.cache.get(guildData.log_channel_id) ||
      await guild.channels.fetch(guildData.log_channel_id).catch(() => null);

    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'Castel Univers Logs' });

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Erreur sendLog :', err.message);
  }
}

module.exports = { sendLog };
