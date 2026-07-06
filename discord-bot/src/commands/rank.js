const { AttachmentBuilder } = require('discord.js');
const { getUser, addLog } = require('../database/db');
const { getLevelInfo } = require('../systems/xp');
const { generateRankCard } = require('../utils/rankCard');
const { sendLog } = require('../utils/logger');

async function handleRankCommand(message) {
  const target = message.mentions.members.first() || message.member;

  const loadingMsg = await message.channel.send('⏳ Génération de ta carte de rang…');

  try {
    const userId  = target.id;
    const guildId = message.guild.id;
    const userData = getUser(userId, guildId);
    const levelInfo = getLevelInfo(userData.xp);

    const avatarUrl = target.user.displayAvatarURL({ extension: 'png', size: 256 });

    const imageBuffer = await generateRankCard({
      username:    target.displayName,
      avatarUrl,
      level:       levelInfo.level,
      xp:          userData.xp,
      nextLevelXP: levelInfo.nextLevelXP,
      xpInLevel:   levelInfo.xpInLevel,
      xpForLevel:  levelInfo.xpForLevel,
      rank:        levelInfo.rank,
      faction:     userData.faction,
      souffle:     userData.souffle,
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: 'rank.png' });

    await loadingMsg.delete().catch(() => {});
    await message.channel.send({ files: [attachment] });

    addLog(guildId, message.author.id, 'RANK_COMMAND', `!rank utilisé pour ${target.user.tag}`);
    await sendLog(message.guild, {
      title:       '📊 Commande !rank',
      description: `${message.author} a consulté le rang de ${target.user.tag}`,
      color:       0x4169E1,
    });
  } catch (err) {
    console.error('Erreur génération rank card :', err);
    await loadingMsg.edit('❌ Impossible de générer la carte de rang. Réessayez plus tard.').catch(() => {});
  }
}

module.exports = { handleRankCommand };
