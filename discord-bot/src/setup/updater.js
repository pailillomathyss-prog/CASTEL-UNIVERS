const { PermissionsBitField } = require('discord.js');
const { createRoles } = require('./roles');
const { createDemonArtRoles } = require('./demonArts');
const { createRolePanel } = require('../panels/rolePanel');
const { createTrainingPanel } = require('../panels/trainingPanel');
const { createDemonTrainingPanel } = require('../panels/demonTrainingPanel');
const { createLeaderboardPanel } = require('../systems/leaderboard');
const { createMissionPanel } = require('../systems/missions');
const { setGuildLog, addLog } = require('../database/db');

// Canaux à vérifier / créer si absents
const REQUIRED_CHANNELS = [
  // [nom, catégorie, type]
  { name: '📜・règlement',              category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '👋・bienvenue',              category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '📢・annonces',               category: '🏯 Domaine des Pourfendeurs', type: 'public', slowmode: 10 },
  { name: '🎴・choix-rôles',           category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '⚔️・entraînement',          category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '🏆・classement',            category: '🏯 Domaine des Pourfendeurs', type: 'public' },
  { name: '👹・repère-des-démons',     category: '🌙 Royaume des Démons',       type: 'public' },
  { name: '🌑・missions-démons',       category: '🌙 Royaume des Démons',       type: 'public' },
  { name: '🩸・entraînement-démoniaque', category: '🌙 Royaume des Démons',    type: 'public' },
  { name: '💬・discussion-générale',   category: '💬 Communauté',               type: 'public' },
  { name: '🔒・staff',                 category: '🛡️ Staff',                   type: 'private' },
  { name: '📋・logs',                  category: '🛡️ Staff',                   type: 'private' },
  { name: '⚙️・configuration',        category: '🛡️ Staff',                   type: 'private' },
];

async function getOrCreateCategory(guild, name, type, adminRoles) {
  let cat = guild.channels.cache.find(c => c.name === name && c.type === 4);
  if (cat) return cat;

  const permissionOverwrites = [];
  if (type === 'private') {
    permissionOverwrites.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
    for (const [, r] of adminRoles) {
      permissionOverwrites.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
    }
  }

  return guild.channels.create({ name, type: 4, permissionOverwrites, reason: '!update Castel Univers' });
}

async function getOrCreateChannel(guild, chDef, adminRoles) {
  const existing = guild.channels.cache.find(c => c.name === chDef.name && c.type === 0);
  if (existing) return { channel: existing, created: false };

  const category = await getOrCreateCategory(guild, chDef.category, chDef.type, adminRoles);

  const permissionOverwrites = [];
  if (chDef.type === 'private') {
    permissionOverwrites.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
    for (const [, r] of adminRoles) {
      permissionOverwrites.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
    }
  }

  const opts = { name: chDef.name, type: 0, parent: category.id, permissionOverwrites, reason: '!update Castel Univers' };
  if (chDef.slowmode) opts.rateLimitPerUser = chDef.slowmode;

  const channel = await guild.channels.create(opts);
  return { channel, created: true };
}

// Vérifie si un panel existe déjà dans un salon (embed bot présent)
async function panelExists(channel, titleKeyword) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    return messages.some(m => m.author.bot && m.embeds.length > 0 &&
      m.embeds[0]?.title?.includes(titleKeyword));
  } catch { return false; }
}

async function updateServer(guild, requestingMember) {
  const log = [];
  log.push('🔄 **Mise à jour du serveur Castel Univers…**\n*(Seules les nouveautés manquantes seront créées)*\n');

  const adminRoles = guild.roles.cache.filter(r =>
    r.permissions.has(PermissionsBitField.Flags.Administrator) && !r.managed && r.id !== guild.roles.everyone.id
  );

  // ── 1. Rôles ────────────────────────────────────────────────
  log.push('**Rôles :**');
  const before = guild.roles.cache.size;
  await createRoles(guild);
  await createDemonArtRoles(guild);
  const added = guild.roles.cache.size - before;
  log.push(added > 0 ? `✅ ${added} nouveau(x) rôle(s) créé(s)` : '☑️ Tous les rôles existent déjà');

  // ── 2. Salons ────────────────────────────────────────────────
  log.push('\n**Salons :**');
  const channelMap = {};
  let newChannels = 0;

  for (const chDef of REQUIRED_CHANNELS) {
    const { channel, created } = await getOrCreateChannel(guild, chDef, adminRoles);
    channelMap[chDef.name] = channel;
    if (created) {
      log.push(`✅ Créé : **${chDef.name}**`);
      newChannels++;
    }
  }
  if (newChannels === 0) log.push('☑️ Tous les salons existent déjà');

  // Helper
  const find = (keyword) =>
    Object.entries(channelMap).find(([n]) => n.includes(keyword))?.[1] ||
    guild.channels.cache.find(c => c.name.includes(keyword) && c.type === 0);

  // ── 3. Panels ────────────────────────────────────────────────
  log.push('\n**Panels :**');
  let newPanels = 0;

  const checks = [
    { channel: find('choix-rôles') || find('choix'), keyword: 'Choisis ton chemin',    create: createRolePanel,          label: '⚔️ Panel choix de faction' },
    { channel: find('⚔️・entraîne') || find('⚔️'), keyword: 'Entraînement des souffles', create: createTrainingPanel,    label: '⚔️ Panel entraînement Pourfendeurs' },
    { channel: find('démoniaque'),                  keyword: 'Entraînement Démoniaque', create: createDemonTrainingPanel, label: '🩸 Panel entraînement démoniaque' },
    { channel: find('missions-démons') || find('missions'), keyword: 'Missions des Démons', create: createMissionPanel,  label: '🌑 Panel missions démons' },
    { channel: find('classement'),                 keyword: 'Classement',              create: (ch) => createLeaderboardPanel(guild, ch), label: '🏆 Panel classement' },
  ];

  for (const check of checks) {
    if (!check.channel) continue;
    const exists = await panelExists(check.channel, check.keyword);
    if (!exists) {
      await check.create(check.channel);
      log.push(`✅ Créé : **${check.label}**`);
      newPanels++;
    }
  }
  if (newPanels === 0) log.push('☑️ Tous les panels existent déjà');

  // ── 4. Logs ──────────────────────────────────────────────────
  const logsChannel = find('logs');
  if (logsChannel) {
    const { setGuildLog } = require('../database/db');
    setGuildLog(guild.id, logsChannel.id);
  }

  addLog(guild.id, requestingMember.id, 'UPDATE', `Mise à jour par ${requestingMember.user.tag}`);

  const total = newChannels + newPanels;
  log.push(total === 0
    ? '\n✅ **Tout est déjà à jour ! Aucune modification effectuée.**'
    : `\n🎉 **Mise à jour terminée !** ${total} élément(s) ajouté(s).`
  );

  return log.join('\n');
}

module.exports = { updateServer };
