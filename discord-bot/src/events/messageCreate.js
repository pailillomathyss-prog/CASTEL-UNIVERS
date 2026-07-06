const { handleXP } = require('../systems/xp');
const { handleRankCommand } = require('../commands/rank');
const { installServer } = require('../setup/installer');
const { getGuild } = require('../database/db');
const { PermissionsBitField } = require('discord.js');

const PREFIX = '!';

module.exports = async function messageCreate(client, message) {
  if (message.author.bot) return;
  if (!message.guild)      return;

  // Gestion des commandes
  if (message.content.startsWith(PREFIX)) {
    const args    = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'rank':
        return handleRankCommand(message);

      case 'install': {
        // Réservé aux administrateurs
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply('❌ Seuls les administrateurs peuvent lancer l\'installation.');
        }

        const guildData = getGuild(message.guild.id);
        if (guildData.installed) {
          return message.reply(
            '⚠️ Le serveur a déjà été installé. Pour réinstaller, contactez un développeur.\n' +
            '*L\'installation existante a été préservée.*'
          );
        }

        const loadingMsg = await message.reply('⚙️ Installation en cours… Cela peut prendre une minute.');

        try {
          const report = await installServer(message.guild, message.member);
          await loadingMsg.edit(report);
        } catch (err) {
          console.error('Erreur installation :', err);
          await loadingMsg.edit('❌ Une erreur est survenue pendant l\'installation : ' + err.message);
        }
        break;
      }

      case 'progression': {
        const { getUser } = require('../database/db');
        const userData = getUser(message.author.id, message.guild.id);
        const { SOUFFLE_REQUIREMENTS } = require('../setup/roles');

        let desc = `**Progression d\'entraînement : ${userData.training_progress}**\n\n`;
        for (const [souffle, req] of Object.entries(SOUFFLE_REQUIREMENTS)) {
          const status = userData.training_progress >= req ? '✅' : '⬜';
          desc += `${status} ${souffle} — ${req} pts\n`;
        }
        if (userData.souffle) desc += `\n🎉 **Souffle actuel : ${userData.souffle}**`;

        return message.reply({ embeds: [{ title: '📊 Ma progression', description: desc, color: 0xFF4500 }] });
      }

      case 'classement':
      case 'leaderboard':
      case 'top': {
        const { getLeaderboard } = require('../database/db');
        const { getLevelInfo } = require('../systems/xp');
        const top = getLeaderboard(message.guild.id, 5);

        if (top.length === 0) {
          return message.reply('*Aucun membre dans le classement pour l\'instant.*');
        }

        const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
        let desc = '';
        for (let i = 0; i < top.length; i++) {
          const u = top[i];
          const info = getLevelInfo(u.xp);
          desc += `${medals[i]} <@${u.user_id}> — Niv. **${info.level}** — ${u.xp.toLocaleString()} XP\n`;
        }

        return message.reply({ embeds: [{ title: '🏆 Top 5', description: desc, color: 0xFFD700 }] });
      }

      default:
        break;
    }

    return;
  }

  // Gain d'XP sur les messages normaux
  await handleXP(message);
};
