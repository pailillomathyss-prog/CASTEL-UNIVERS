const { PermissionsBitField } = require('discord.js');
const { createRoles } = require('./roles');
const { createDemonArtRoles } = require('./demonArts');
const { createRolePanel } = require('../panels/rolePanel');
const { createTrainingPanel } = require('../panels/trainingPanel');
const { createDemonTrainingPanel } = require('../panels/demonTrainingPanel');
const { createLeaderboardPanel } = require('../systems/leaderboard');
const { createMissionPanel } = require('../systems/missions');
const { setGuildLog, setGuildInstalled, getGuild, addLog } = require('../database/db');

// Structure des catégories et salons
const SERVER_STRUCTURE = [
  {
    name: '🏯 Domaine des Pourfendeurs',
    type: 'public',
    channels: [
      { name: '📜・règlement',     type: 'text' },
      { name: '👋・bienvenue',     type: 'text' },
      { name: '📢・annonces',      type: 'text', slowmode: 10 },
      { name: '🎴・choix-rôles',  type: 'text' },
      { name: '⚔️・entraînement', type: 'text' },
      { name: '🏆・classement',   type: 'text' },
    ],
  },
  {
    name: '🌙 Royaume des Démons',
    type: 'public',
    channels: [
      { name: '👹・repère-des-démons',      type: 'text' },
      { name: '🌑・missions-démons',        type: 'text' },
      { name: '🩸・entraînement-démoniaque', type: 'text' },
    ],
  },
  {
    name: '💬 Communauté',
    type: 'public',
    channels: [
      { name: '💬・discussion-générale', type: 'text' },
    ],
  },
  {
    name: '🛡️ Staff',
    type: 'private',
    channels: [
      { name: '🔒・staff',          type: 'text' },
      { name: '📋・logs',           type: 'text' },
      { name: '⚙️・configuration', type: 'text' },
    ],
  },
];

async function installServer(guild, requestingMember) {
  getGuild(guild.id);

  const adminRoles = guild.roles.cache.filter(r =>
    r.permissions.has(PermissionsBitField.Flags.Administrator) && !r.managed && r.id !== guild.roles.everyone.id
  );

  const messages = [];
  messages.push('⚙️ **Début de l\'installation du serveur Castel Univers…**\n');

  // 1. Rôles Pourfendeurs (souffles)
  messages.push('🔧 Création des rôles Pourfendeurs…');
  const createdRoles = await createRoles(guild);
  messages.push(`✅ ${Object.keys(createdRoles).length} rôles Pourfendeurs créés/vérifiés`);

  // 2. Arts Sanguinaires (rôles démons)
  messages.push('🔧 Création des Arts Sanguinaires…');
  const demonRoles = await createDemonArtRoles(guild);
  messages.push(`✅ ${Object.keys(demonRoles).length} Arts Sanguinaires créés/vérifiés`);

  // 3. Structure salons
  messages.push('\n🔧 Création de la structure des salons…');
  const channelMap = {};

  for (const cat of SERVER_STRUCTURE) {
    let category = guild.channels.cache.find(c => c.name === cat.name && c.type === 4);

    const permissionOverwrites = [];
    if (cat.type === 'private') {
      permissionOverwrites.push({ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] });
      for (const [, adminRole] of adminRoles) {
        permissionOverwrites.push({
          id: adminRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
      }
    }

    if (!category) {
      category = await guild.channels.create({
        name: cat.name, type: 4,
        permissionOverwrites,
        reason: 'Installation Castel Univers',
      });
      messages.push(`✅ Catégorie : **${cat.name}**`);
    }

    for (const ch of cat.channels) {
      let channel = guild.channels.cache.find(c => c.name === ch.name);
      if (!channel) {
        const opts = {
          name: ch.name, type: 0,
          parent: category.id,
          permissionOverwrites: cat.type === 'private' ? permissionOverwrites : [],
          reason: 'Installation Castel Univers',
        };
        if (ch.slowmode) opts.rateLimitPerUser = ch.slowmode;
        channel = await guild.channels.create(opts);
        messages.push(`  └ ✅ Salon : **${ch.name}**`);
      }
      channelMap[ch.name] = channel;
    }
  }

  // Helper recherche canal
  const findChannel = (keyword) =>
    Object.entries(channelMap).find(([name]) => name.includes(keyword))?.[1] ||
    guild.channels.cache.find(c => c.name.includes(keyword) && c.type === 0);

  const choixRolesChannel        = findChannel('choix-rôles') || findChannel('choix');
  const entrainementChannel      = findChannel('⚔️・entraînement') || findChannel('entraîne');
  const demonTrainingChannel     = findChannel('entraînement-démoniaque') || findChannel('démoniaque');
  const missionsChannel          = findChannel('missions-démons') || findChannel('missions');
  const classementChannel        = findChannel('classement');
  const logsChannel              = findChannel('logs');
  const bienvenueChannel         = findChannel('bienvenue');

  // 4. Panels
  messages.push('\n🔧 Création des panels interactifs…');

  if (choixRolesChannel) {
    await createRolePanel(choixRolesChannel);
    messages.push('✅ Panel choix de faction → **#choix-rôles**');
  }
  if (entrainementChannel) {
    await createTrainingPanel(entrainementChannel);
    messages.push('✅ Panel entraînement Pourfendeurs → **#entraînement**');
  }
  if (demonTrainingChannel) {
    await createDemonTrainingPanel(demonTrainingChannel);
    messages.push('✅ Panel entraînement démoniaque → **#entraînement-démoniaque**');
  }
  if (missionsChannel) {
    await createMissionPanel(missionsChannel);
    messages.push('✅ Panel missions démons → **#missions-démons**');
  }
  if (classementChannel) {
    await createLeaderboardPanel(guild, classementChannel);
    messages.push('✅ Panel classement → **#classement**');
  }

  // 5. Message de bienvenue
  if (bienvenueChannel) {
    await bienvenueChannel.send({
      embeds: [{
        title: '⚔️ Bienvenue dans Castel Univers !',
        description:
          'Ce serveur est dédié à l\'univers de **Demon Slayer**.\n\n' +
          '📜 Lisez le règlement\n' +
          '🎴 Choisissez votre faction dans **#choix-rôles**\n' +
          '⚔️ Pourfendeurs → entraînez-vous dans **#entraînement**\n' +
          '👹 Démons → accomplissez des **#missions-démons** et entraînez-vous dans **#entraînement-démoniaque**\n' +
          '💬 Discutez dans **#discussion-générale**\n\n' +
          '*Que votre lame ou votre Art Sanguinaire brille dans la nuit* 🌸',
        color: 0x4169E1,
        footer: { text: 'Castel Univers • Demon Slayer Community' },
      }],
    });
    messages.push('✅ Message de bienvenue envoyé');
  }

  // 6. DB
  setGuildInstalled(guild.id);
  if (logsChannel) setGuildLog(guild.id, logsChannel.id);
  addLog(guild.id, requestingMember.id, 'INSTALL', `Installation par ${requestingMember.user.tag}`);

  messages.push('\n🎉 **Installation terminée ! Le serveur est prêt.**');
  return messages.join('\n');
}

module.exports = { installServer, SERVER_STRUCTURE };
