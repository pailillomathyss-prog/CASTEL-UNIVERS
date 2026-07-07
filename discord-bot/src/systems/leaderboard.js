const { EmbedBuilder } = require('discord.js');
const { getLeaderboard, getGuild, setLeaderboardMessage } = require('../database/db');
const { getLevelInfo } = require('./xp');

// Map guildId → { channelId, messageId }
const leaderboardMessages = new Map();

function buildLeaderboardEmbed(top, guild) {
  if (top.length === 0) {
    return new EmbedBuilder()
      .setTitle('🏆 Classement des Pourfendeurs')
      .setDescription('*Aucun membre classé pour l\'instant. Discutez pour gagner de l\'XP !*')
      .setColor(0xFFD700)
      .setFooter({ text: `Mis à jour • ${new Date().toLocaleTimeString('fr-FR')}` })
      .setTimestamp();
  }

  const medals = ['🥇', '🥈', '🥉'];
  let description = '';

  for (let i = 0; i < top.length; i++) {
    const user = top[i];
    const info = getLevelInfo(user.xp);
    const medal = medals[i] || `**${i + 1}.**`;
    const percent = Math.round(Math.min(user.xp > 0 ? (info.xpInLevel / info.xpForLevel) : 0, 1) * 100);

    description += `${medal} <@${user.user_id}>\n`;
    description += `    Niv. **${info.level}** • ${user.xp.toLocaleString('fr-FR')} XP • ${percent}% → Niv. ${info.level + 1}\n`;
    if (user.souffle) description += `    ${user.souffle}\n`;
    description += '\n';
  }

  return new EmbedBuilder()
    .setTitle('🏆 Classement — Top 10')
    .setDescription(description)
    .setColor(0xFFD700)
    .setFooter({ text: `Castel Univers • Mis à jour à ${new Date().toLocaleTimeString('fr-FR')}` })
    .setTimestamp();
}

async function createLeaderboardPanel(guild, channel) {
  // Supprime l'ancien message si présent
  const messages = await channel.messages.fetch({ limit: 20 });
  const old = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Classement'));
  if (old) await old.delete().catch(() => {});

  const top   = getLeaderboard(guild.id, 10);
  const embed = buildLeaderboardEmbed(top, guild);
  const sent  = await channel.send({ embeds: [embed] });

  // Mémorise le message pour les éditions futures
  leaderboardMessages.set(guild.id, { channelId: channel.id, messageId: sent.id });
  setLeaderboardMessage(guild.id, channel.id, sent.id);

  return sent;
}

async function refreshLeaderboard(guild) {
  const entry = leaderboardMessages.get(guild.id);
  if (!entry) return;

  try {
    const channel = await guild.channels.fetch(entry.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(entry.messageId).catch(() => null);
    if (!message) return;

    const top   = getLeaderboard(guild.id, 10);
    const embed = buildLeaderboardEmbed(top, guild);
    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.error(`[Leaderboard] Erreur refresh guild ${guild.id}:`, err.message);
  }
}

// Charge les entrées persistées depuis la DB au démarrage
function loadLeaderboardFromDB(guilds) {
  for (const guild of guilds) {
    const data = getGuild(guild.id);
    if (data.leaderboard_channel_id && data.leaderboard_message_id) {
      leaderboardMessages.set(guild.id, {
        channelId: data.leaderboard_channel_id,
        messageId: data.leaderboard_message_id,
      });
    }
  }
}

// Démarre l'auto-refresh toutes les 60 secondes
function startLeaderboardAutoRefresh(client) {
  setInterval(async () => {
    for (const [guildId] of leaderboardMessages) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) await refreshLeaderboard(guild);
    }
  }, 60_000);
}

module.exports = {
  createLeaderboardPanel,
  refreshLeaderboard,
  loadLeaderboardFromDB,
  startLeaderboardAutoRefresh,
};
