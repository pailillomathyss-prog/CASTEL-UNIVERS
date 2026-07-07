const { PermissionsBitField } = require('discord.js');
const { createRoles } = require('./roles');
const { createDemonArtRoles } = require('./demonArts');
const { createRolePanel } = require('../panels/rolePanel');
const { createTrainingPanel } = require('../panels/trainingPanel');
const { createDemonTrainingPanel } = require('../panels/demonTrainingPanel');
const { createLeaderboardPanel } = require('../systems/leaderboard');
const { createMissionPanel } = require('../systems/missions');
const { setGuildLog, addLog } = require('../database/db');

// Liste complète des salons attendus avec leur catégorie
const REQUIRED_CHANNELS = [
  { name: '📜・règlement',               category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '👋・bienvenue',               category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '📢・annonces',                category: '🏯 Domaine des Pourfendeurs', type: 'public', slowmode: 10 },
  { name: '🎴・choix-rôles',            category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '⚔️・entraînement',           category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '🏆・classement',             category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '👹・repère-des-démons',      category: '🌙 Royaume des Démons',       type: 'public' },
  { name: '🌑・missions-démons',        category: '🌙 Royaume des Démons',       type: 'public' },
  { name: '🩸・entraînement-démoniaque', category: '🌙 Royaume des Démons',     type: 'public' },
  { name: '💬・discussion-générale',    category: '💬 Communauté',               type: 'public' },
  { name: '🔒・staff',                  category: '🛡️ Staff',                   type: 'private' },
  { name: '📋・logs',                   category: '🛡️ Staff',                   type: 'private' },
  { name: '⚙️・configuration',         category: '🛡️ Staff',                   type: 'private' },
];

async function getOrCreateCategory(guild, name, type, adminRoles) {
  const existing = guild.channels.cache.find(c => c.name === name && c.type === 4);
  if (existing) return existing;

  const permissionOverwrites = buildPerms(guild, type, adminRoles);
  return guild.channels.create({ name, type: 4, permissionOverwrites, reason: '!update Castel Univers' });
}

function buildPerms(guild, type, adminRoles) {
  if (type !== 'private') return [];
  const perms = [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }];
  for (const [, r] of adminRoles) {
    perms.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
  }
  return perms;
}

// Retourne le canal existant ou le crée ; indique si c'était une création
async function ensureChannel(guild, chDef, adminRoles) {
  // Cherche par nom exact
  const existing = guild.channels.cache.find(c => c.name === chDef.name && c.type === 0);
  if (existing) return { channel: existing, created: false };

  const category = await getOrCreateCategory(guild, chDef.category, chDef.type, adminRoles);
  const opts = {
    name: chDef.name,
    type: 0,
    parent: category.id,
    permissionOverwrites: buildPerms(guild, chDef.type, adminRoles),
    reason: '!update Castel Univers',
  };
  if (chDef.slowmode) opts.rateLimitPerUser = chDef.slowmode;

  const channel = await guild.channels.create(opts);
  return { channel, created: true };
}

// Trouve un canal par mot-clé dans le cache
function findChannel(guild, ...keywords) {
  for (const kw of keywords) {
    const ch = guild.channels.cache.find(c => c.type === 0 && c.name.includes(kw));
    if (ch) return ch;
  }
  return null;
}

async function updateServer(guild, requestingMember) {
  const log = [];
  log.push('🔄 **Mise à jour du serveur Castel Univers…**\n');

  const adminRoles = guild.roles.cache.filter(r =>
    r.permissions.has(PermissionsBitField.Flags.Administrator) &&
    !r.managed && r.id !== guild.roles.everyone.id
  );

  // ── 1. Rôles ────────────────────────────────────────────────
  log.push('**🎭 Rôles :**');
  const sizeBefore = guild.roles.cache.size;
  await createRoles(guild);

  // Recharge le cache des rôles
  await guild.roles.fetch();
  await createDemonArtRoles(guild);
  await guild.roles.fetch();

  const sizeAfter = guild.roles.cache.size;
  const addedRoles = sizeAfter - sizeBefore;
  log.push(addedRoles > 0
    ? `✅ ${addedRoles} nouveau(x) rôle(s) créé(s)`
    : '☑️ Tous les rôles sont déjà présents');

  // ── 2. Salons ────────────────────────────────────────────────
  log.push('\n**💬 Salons :**');
  let newChannels = 0;

  for (const chDef of REQUIRED_CHANNELS) {
    const { created } = await ensureChannel(guild, chDef, adminRoles);
    if (created) {
      log.push(`✅ Créé : **${chDef.name}**`);
      newChannels++;
    }
  }

  // Recharge le cache des canaux après création
  await guild.channels.fetch();

  if (newChannels === 0) log.push('☑️ Tous les salons sont déjà présents');

  // ── 3. Panels ────────────────────────────────────────────────
  // Les fonctions createX suppriment l'ancien panel et en créent un nouveau.
  // On les appelle toujours pour s'assurer qu'ils sont à jour.
  log.push('\n**🎛️ Panels (mis à jour) :**');

  const panelTasks = [
    {
      channel: findChannel(guild, 'choix-rôles', 'choix'),
      fn: createRolePanel,
      label: '⚔️ Panel choix de faction → #choix-rôles',
    },
    {
      channel: findChannel(guild, 'entraînement-démoniaque', 'démoniaque'),
      fn: createDemonTrainingPanel,
      label: '🩸 Panel entraînement démoniaque → #entraînement-démoniaque',
    },
    {
      channel: findChannel(guild, 'missions-démons', 'missions'),
      fn: createMissionPanel,
      label: '🌑 Panel missions démons → #missions-démons',
    },
    {
      channel: findChannel(guild, 'classement'),
      fn: (ch) => createLeaderboardPanel(guild, ch),
      label: '🏆 Panel classement → #classement',
    },
  ];

  // Entraînement Pourfendeurs — cherche le salon ⚔️・entraînement (pas le démoniaque)
  const trainingCh = guild.channels.cache.find(c =>
    c.type === 0 && c.name.includes('entraînement') && !c.name.includes('démoniaque')
  );
  if (trainingCh) {
    panelTasks.unshift({
      channel: trainingCh,
      fn: createTrainingPanel,
      label: '⚔️ Panel entraînement Pourfendeurs → #entraînement',
    });
  }

  for (const task of panelTasks) {
    if (!task.channel) {
      log.push(`⚠️ Salon introuvable pour : ${task.label}`);
      continue;
    }
    try {
      await task.fn(task.channel);
      log.push(`✅ ${task.label}`);
    } catch (err) {
      log.push(`❌ Erreur panel : ${task.label} — ${err.message}`);
    }
  }

  // ── 4. Canal de logs ─────────────────────────────────────────
  const logsChannel = findChannel(guild, 'logs');
  if (logsChannel) setGuildLog(guild.id, logsChannel.id);

  addLog(guild.id, requestingMember.id, 'UPDATE', `Mise à jour par ${requestingMember.user.tag}`);

  log.push(`\n🎉 **Mise à jour terminée !** ${newChannels} salon(s) ajouté(s), tous les panels ont été rafraîchis.`);
  return log.join('\n');
}

module.exports = { updateServer };
