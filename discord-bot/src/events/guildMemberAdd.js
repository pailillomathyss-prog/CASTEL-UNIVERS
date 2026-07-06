const { getUser, addLog } = require('../database/db');
const { sendLog } = require('../utils/logger');

module.exports = async function guildMemberAdd(client, member) {
  const { guild } = member;

  // Initialise l'utilisateur en base
  getUser(member.id, guild.id);

  // Donne le rôle "Nouveau membre"
  const nouveauRole = guild.roles.cache.find(r => r.name === '🌸 Nouveau membre');
  if (nouveauRole) {
    await member.roles.add(nouveauRole, 'Nouveau membre').catch(() => {});
  }

  // Log
  addLog(guild.id, member.id, 'MEMBER_JOIN', `${member.user.tag} a rejoint le serveur`);

  await sendLog(guild, {
    title:       '👋 Nouveau membre',
    description: `${member} (**${member.user.tag}**) a rejoint **${guild.name}**\n🌸 Rôle "Nouveau membre" attribué`,
    color:       0xFFB6C1,
  });

  // Message de bienvenue dans le canal approprié
  const bienvenueChannel = guild.channels.cache.find(c =>
    c.name.includes('bienvenue') && c.type === 0
  );

  if (bienvenueChannel) {
    await bienvenueChannel.send({
      embeds: [{
        title:       `⚔️ Bienvenue, ${member.displayName} !`,
        description:
          `Bienvenue dans **Castel Univers** !\n\n` +
          `🎴 Rends-toi dans **#choix-rôles** pour rejoindre une faction\n` +
          `⚔️ Commence ton entraînement dans **#entraînement** pour obtenir un Souffle\n` +
          `💬 Discute avec la communauté dans **#discussion-générale**\n\n` +
          `*Que ton chemin soit glorieux* 🌸`,
        color:       0xFFB6C1,
        thumbnail:   { url: member.user.displayAvatarURL() },
        footer:      { text: 'Castel Univers • Demon Slayer Community' },
        timestamp:   new Date().toISOString(),
      }],
    }).catch(() => {});
  }
};
