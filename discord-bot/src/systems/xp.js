const { getUser, updateUser, addLog } = require('../database/db');
const { sendLog } = require('../utils/logger');

// Configuration XP
const XP_PER_MESSAGE   = { min: 10, max: 20 };
const XP_COOLDOWN_MS   = 60_000; // 1 minute entre deux gains d'XP
const ALLOWED_CHANNEL_KEYWORDS = ['discussion', 'général', 'repère', 'missions', 'entraînement', 'communauté'];

// Salons interdits pour l'XP
const BLOCKED_CHANNEL_KEYWORDS = ['annonces', 'règlement', 'logs', 'configuration', 'classement', 'choix'];

// Paliers de niveau
const LEVELS = [
  { level: 1,  rank: '🌱 Nouveau membre',        xpRequired: 0     },
  { level: 5,  rank: '⚔️ Recrue',                xpRequired: 500   },
  { level: 15, rank: '🗡️ Pourfendeur confirmé', xpRequired: 3000  },
  { level: 30, rank: '🔥 Guerrier d\'élite',     xpRequired: 10000 },
  { level: 50, rank: '🌸 Tsuguko',               xpRequired: 25000 },
  { level: 75, rank: '👑 Pilier',                xpRequired: 60000 },
];

function getLevelInfo(xp) {
  let currentLevel = 1;
  let currentRank  = LEVELS[0].rank;
  let nextLevelXP  = 500;

  for (const l of LEVELS) {
    if (xp >= l.xpRequired) {
      currentLevel = l.level;
      currentRank  = l.rank;
    }
  }

  // XP pour le niveau suivant (simple formule)
  nextLevelXP = Math.floor(100 * Math.pow(currentLevel, 1.5));

  // XP requis depuis le debut du niveau actuel
  const currentLevelXP = Math.floor(100 * Math.pow(currentLevel, 1.5));
  const previousLevelXP = currentLevel > 1 ? Math.floor(100 * Math.pow(currentLevel - 1, 1.5)) : 0;

  return {
    level:          currentLevel,
    rank:           currentRank,
    nextLevelXP:    currentLevelXP,
    xpInLevel:      xp - previousLevelXP,
    xpForLevel:     currentLevelXP - previousLevelXP,
  };
}

function xpToLevel(xp) {
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
}

async function handleXP(message) {
  if (message.author.bot) return;
  if (!message.guild)      return;
  if (message.content.startsWith('!')) return;

  const channelName = message.channel.name.toLowerCase();

  // Vérifie si le canal est interdit
  const blocked = BLOCKED_CHANNEL_KEYWORDS.some(k => channelName.includes(k));
  if (blocked) return;

  const userId  = message.author.id;
  const guildId = message.guild.id;
  const now     = Date.now();

  const userData = getUser(userId, guildId);

  // Anti-spam cooldown
  if (now - (userData.last_xp || 0) < XP_COOLDOWN_MS) return;

  const gained = Math.floor(
    Math.random() * (XP_PER_MESSAGE.max - XP_PER_MESSAGE.min + 1) + XP_PER_MESSAGE.min
  );
  const newXP     = userData.xp + gained;
  const oldLevel  = xpToLevel(userData.xp);
  const newLevel  = xpToLevel(newXP);

  updateUser(userId, guildId, {
    xp:       newXP,
    level:    newLevel,
    last_xp:  now,
  });

  // Level up !
  if (newLevel > oldLevel) {
    const levelInfo = getLevelInfo(newXP);
    addLog(guildId, userId, 'LEVEL_UP', `Niveau ${newLevel} (${levelInfo.rank})`);

    await sendLog(message.guild, {
      title:       '🆙 Passage de niveau !',
      description: `${message.author} est passé au **niveau ${newLevel}** !\nRang : **${levelInfo.rank}**`,
      color:       0x00FF7F,
    });

    await message.channel.send({
      embeds: [{
        title:       '🆙 Level Up !',
        description: `Félicitations ${message.author} ! Tu atteins le **niveau ${newLevel}** !\n🏅 Rang : **${levelInfo.rank}**`,
        color:       0x00FF7F,
        thumbnail:   { url: message.author.displayAvatarURL() },
      }],
    }).catch(() => {});
  }
}

module.exports = { handleXP, getLevelInfo, xpToLevel, LEVELS };
