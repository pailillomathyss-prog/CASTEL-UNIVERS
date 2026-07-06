const { EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../database/db');
const { getLevelInfo } = require('./xp');

async function createLeaderboardPanel(guild, channel) {
  const messages = await channel.messages.fetch({ limit: 20 });
  const old = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Classement'));
  if (old) await old.delete().catch(() => {});

  await refreshLeaderboard(guild, channel);
}

async function refreshLeaderboard(guild, channel) {
  const top = getLeaderboard(guild.id, 10);

  if (top.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('🏆 Classement des Pourfendeurs')
      .setDescription('*Aucun membre classé pour l\'instant. Commencez à discuter pour gagner de l\'XP !*')
      .setColor(0xFFD700)
      .setFooter({ text: `Mis à jour le ${new Date().toLocaleDateString('fr-FR')}` });

    return channel.send({ embeds: [embed] });
  }

  const medals = ['🥇', '🥈', '🥉'];
  let description = '';

  for (let i = 0; i < top.length; i++) {
    const user = top[i];
    const info = getLevelInfo(user.xp);
    const medal = medals[i] || `**${i + 1}.**`;

    let memberTag = `<@${user.user_id}>`;
    try {
      const member = await guild.members.fetch(user.user_id).catch(() => null);
      if (member) memberTag = member.displayName;
    } catch {}

    description += `${medal} **${memberTag}**\n`;
    description += `    Niveau **${info.level}** • ${user.xp.toLocaleString()} XP • ${info.rank}\n`;
    if (user.souffle) description += `    ${user.souffle}\n`;
    description += '\n';
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Classement des Pourfendeurs')
    .setDescription(description)
    .setColor(0xFFD700)
    .setFooter({ text: `Castel Univers • Mis à jour le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}` })
    .setTimestamp();

  return channel.send({ embeds: [embed] });
}

module.exports = { createLeaderboardPanel, refreshLeaderboard };
