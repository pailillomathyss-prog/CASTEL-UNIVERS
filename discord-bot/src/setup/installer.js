const { PermissionsBitField } = require('discord.js');
const { createRoles } = require('./roles');
const { createRolePanel } = require('../panels/rolePanel');
const { createTrainingPanel } = require('../panels/trainingPanel');
const { createLeaderboardPanel } = require('../systems/leaderboard');
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
      { name: '👹・repère-des-démons', type: 'text' },
      { name: '🌑・missions-démons',   type: 'text' },
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
  const guildData = getGuild(guild.id);

  // Récupère les rôles admins existants pour les perms staff
  const adminRoles = guild.roles.cache.filter(r =>
    r.permissions.has(PermissionsBitField.Flags.Administrator) && !r.managed && r.id !== guild.roles.everyone.id
  );

  const messages = [];
  messages.push('⚙️ **Début de l\'installation du serveur Castel Univers…**\n');

  // 1. Création des rôles
  messages.push('🔧 Création des rôles…');
  const createdRoles = await createRoles(guild);
  messages.push(`✅ ${Object.keys(createdRoles).length} rôles créés/vérifiés`);

  // 2. Création des catégories et salons
  messages.push('\n🔧 Création de la structure des salons…');
  const channelMap = {};

  for (const cat of SERVER_STRUCTURE) {
    // Vérifie si la catégorie existe déjà
    let category = guild.channels.cache.find(c => c.name === cat.name && c.type === 4);

    const permissionOverwrites = [];
    if (cat.type === 'private') {
      // Salon privé : visible uniquement par les admins
      permissionOverwrites.push({
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      });
      for (const [, adminRole] of adminRoles) {
        permissionOverwrites.push({
          id: adminRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
      }
    }

    if (!category) {
      category = await guild.channels.create({
        name: cat.name,
        type: 4, // CategoryChannel
        permissionOverwrites,
        reason: 'Installation Castel Univers',
      });
      messages.push(`✅ Catégorie : **${cat.name}**`);
    }

    for (const ch of cat.channels) {
      let channel = guild.channels.cache.find(c => c.name === ch.name.replace(/[^a-zA-ZÀ-ÿ0-9-]/g, '') || c.name === ch.name);

      if (!channel) {
        const createOpts = {
          name: ch.name,
          type: 0, // TextChannel
          parent: category.id,
          permissionOverwrites: cat.type === 'private' ? permissionOverwrites : [],
          reason: 'Installation Castel Univers',
        };
        if (ch.slowmode) createOpts.rateLimitPerUser = ch.slowmode;

        channel = await guild.channels.create(createOpts);
        messages.push(`  └ ✅ Salon : **${ch.name}**`);
      }

      channelMap[ch.name] = channel;
    }
  }

  // 3. Trouver les canaux par mot-clé
  const findChannel = (keyword) =>
    Object.entries(channelMap).find(([name]) => name.includes(keyword))?.[1] ||
    guild.channels.cache.find(c => c.name.includes(keyword) && c.type === 0);

  const choixRolesChannel  = findChannel('choix-rôles') || findChannel('choix');
  const entrainementChannel = findChannel('entraînement') || findChannel('entrainement');
  const classementChannel  = findChannel('classement');
  const logsChannel        = findChannel('logs');
  const bienvenueChannel   = findChannel('bienvenue');

  // 4. Panels interactifs
  messages.push('\n🔧 Création des panels interactifs…');

  if (choixRolesChannel) {
    await createRolePanel(choixRolesChannel);
    messages.push('✅ Panel de choix de faction créé dans **#choix-rôles**');
  }

  if (entrainementChannel) {
    await createTrainingPanel(entrainementChannel);
    messages.push('✅ Panel d\'entraînement créé dans **#entraînement**');
  }

  if (classementChannel) {
    await createLeaderboardPanel(guild, classementChannel);
    messages.push('✅ Panel classement créé dans **#classement**');
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
          '⚔️ Entraînez-vous dans **#entraînement** pour obtenir un Souffle\n' +
          '💬 Discutez avec la communauté\n\n' +
          '*Que votre lame brille dans la nuit* 🌸',
        color: 0x4169E1,
        thumbnail: { url: 'https://i.imgur.com/Zn2PRBL.png' },
        footer: { text: 'Castel Univers • Demon Slayer Community' },
      }],
    });
    messages.push('✅ Message de bienvenue envoyé');
  }

  // 6. Sauvegarde en base
  setGuildInstalled(guild.id);
  if (logsChannel) setGuildLog(guild.id, logsChannel.id);

  addLog(guild.id, requestingMember.id, 'INSTALL', `Installation effectuée par ${requestingMember.user.tag}`);

  messages.push('\n🎉 **Installation terminée ! Le serveur est prêt à l\'emploi.**');
  return messages.join('\n');
}

module.exports = { installServer, SERVER_STRUCTURE };
