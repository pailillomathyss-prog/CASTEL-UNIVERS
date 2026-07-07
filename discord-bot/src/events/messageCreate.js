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
            '⚠️ Le serveur a déjà été installé.\n' +
            '💡 Utilise **`!update`** pour ajouter uniquement les nouveautés manquantes.'
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

      case 'update': {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply('❌ Seuls les administrateurs peuvent lancer une mise à jour.');
        }

        const loadingMsg = await message.reply('🔄 Vérification des nouveautés… Cela peut prendre quelques secondes.');

        try {
          const { updateServer } = require('../setup/updater');
          const report = await updateServer(message.guild, message.member);
          await loadingMsg.edit(report);
        } catch (err) {
          console.error('Erreur update :', err);
          await loadingMsg.edit('❌ Une erreur est survenue pendant la mise à jour : ' + err.message);
        }
        break;
      }

      case 'delete': {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply('❌ Seuls les administrateurs peuvent utiliser cette commande.');
        }

        // Demande de confirmation
        const confirm = await message.reply(
          '⚠️ **Attention !** Cette commande va supprimer **tous les salons, catégories et rôles** créés par le bot.\n\n' +
          'Réponds **`CONFIRMER`** dans les 30 secondes pour continuer, ou ignore ce message pour annuler.'
        );

        try {
          const filter = m => m.author.id === message.author.id && m.content === 'CONFIRMER';
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30_000, errors: ['time'] });

          await collected.first().delete().catch(() => {});
          await confirm.delete().catch(() => {});

          const loadingMsg = await message.channel.send('🗑️ Suppression en cours…');

          const { deleteServer } = require('../setup/cleaner');
          const report = await deleteServer(message.guild, message.member);
          await loadingMsg.edit(report);

        } catch {
          await confirm.edit('❌ Suppression annulée — confirmation non reçue dans les temps.').catch(() => {});
        }
        break;
      }

      case 'update1.5': {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply('❌ Seuls les administrateurs peuvent lancer cette mise à jour.');
        }

        const loadingMsg = await message.reply('🔄 Application de la mise à jour v1.5…');

        try {
          const { migrateV15 } = require('../database/db');
          const { updateServer } = require('../setup/updater');

          // 1. Migration de la base de données
          migrateV15();

          // 2. Mise à jour des salons, rôles et panels
          const report = await updateServer(message.guild, message.member);

          await loadingMsg.edit(
            '✅ **Mise à jour v1.5 appliquée !**\n\n' +
            '**Nouveautés :**\n' +
            '🩸 Missions démons : **1 par jour**\n' +
            '⚔️ Entraînement Pourfendeurs : **1 par jour**\n' +
            '👹 Entraînement démoniaque : **1 par jour**\n\n' +
            report
          );
        } catch (err) {
          console.error('Erreur update1.5 :', err);
          await loadingMsg.edit('❌ Erreur pendant la mise à jour v1.5 : ' + err.message);
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
