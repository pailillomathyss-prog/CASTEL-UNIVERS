const { ROLES } = require('./roles');
const { DEMON_ARTS } = require('./demonArts');
const { addLog } = require('../database/db');

// Tous les noms de rôles créés par le bot
const BOT_ROLE_NAMES = new Set([
  ...ROLES.map(r => r.name),
  ...DEMON_ARTS.map(a => a.name),
]);

// Tous les noms de salons créés par le bot
const BOT_CHANNEL_NAMES = new Set([
  '📜・règlement',
  '👋・bienvenue',
  '📢・annonces',
  '🎴・choix-rôles',
  '⚔️・entraînement',
  '🏆・classement',
  '👹・repère-des-démons',
  '🌑・missions-démons',
  '🩸・entraînement-démoniaque',
  '💬・discussion-générale',
  '🔒・staff',
  '📋・logs',
  '⚙️・configuration',
]);

// Toutes les catégories créées par le bot
const BOT_CATEGORY_NAMES = new Set([
  '🏯 Domaine des Pourfendeurs',
  '🌙 Royaume des Démons',
  '💬 Communauté',
  '🛡️ Staff',
]);

async function deleteServer(guild, requestingMember) {
  const log = [];
  log.push('🗑️ **Suppression des éléments Castel Univers…**\n');

  let deletedChannels = 0;
  let deletedCategories = 0;
  let deletedRoles = 0;
  const errors = [];

  // ── 1. Salons texte ──────────────────────────────────────────
  for (const [, channel] of guild.channels.cache) {
    if (channel.type === 0 && BOT_CHANNEL_NAMES.has(channel.name)) {
      try {
        await channel.delete('!delete Castel Univers');
        deletedChannels++;
      } catch (err) {
        errors.push(`Salon ${channel.name} : ${err.message}`);
      }
    }
  }

  // ── 2. Catégories ────────────────────────────────────────────
  for (const [, channel] of guild.channels.cache) {
    if (channel.type === 4 && BOT_CATEGORY_NAMES.has(channel.name)) {
      try {
        await channel.delete('!delete Castel Univers');
        deletedCategories++;
      } catch (err) {
        errors.push(`Catégorie ${channel.name} : ${err.message}`);
      }
    }
  }

  // ── 3. Rôles ────────────────────────────────────────────────
  // Recharge le cache des rôles pour être sûr
  await guild.roles.fetch();

  for (const [, role] of guild.roles.cache) {
    if (BOT_ROLE_NAMES.has(role.name)) {
      try {
        await role.delete('!delete Castel Univers');
        deletedRoles++;
      } catch (err) {
        errors.push(`Rôle ${role.name} : ${err.message}`);
      }
    }
  }

  // ── 4. Reset DB ──────────────────────────────────────────────
  const db = require('better-sqlite3')(
    require('path').join(__dirname, '../../data/castel-univers.db')
  );
  db.prepare(
    'UPDATE guilds SET installed = 0, installed_at = NULL, log_channel_id = NULL, leaderboard_channel_id = NULL, leaderboard_message_id = NULL WHERE guild_id = ?'
  ).run(guild.id);
  db.close();

  // ── Rapport ──────────────────────────────────────────────────
  log.push(`✅ **${deletedChannels}** salon(s) supprimé(s)`);
  log.push(`✅ **${deletedCategories}** catégorie(s) supprimée(s)`);
  log.push(`✅ **${deletedRoles}** rôle(s) supprimé(s)`);

  if (errors.length > 0) {
    log.push(`\n⚠️ **${errors.length} erreur(s) :**`);
    for (const e of errors.slice(0, 5)) log.push(`• ${e}`);
    if (errors.length > 5) log.push(`• … et ${errors.length - 5} autre(s)`);
  }

  log.push('\n🏁 **Suppression terminée.** Lance `!install` pour tout recréer proprement.');

  addLog(guild.id, requestingMember.id, 'DELETE', `Suppression par ${requestingMember.user.tag}`);

  return log.join('\n');
}

module.exports = { deleteServer };
