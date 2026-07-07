const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUser, updateUser, addLog } = require('../database/db');
const { sendLog } = require('../utils/logger');
const { DEMON_ARTS } = require('../setup/demonArts');

// Pool de missions démons
const DEMON_MISSIONS = [
  {
    id: 'mission_village',
    title: '🩸 Infiltration nocturne',
    description: 'Un village isolé doit être terrorisé avant l\'aube. Évite les Pourfendeurs et accomplis ta mission.',
    difficulty: '⭐ Facile',
    xpReward: 80,
    progressReward: 15,
    question: 'Comment tu approches le village ?',
    options: ['En te dissimulant dans les ombres', 'En attaquant frontalement', 'En envoyant des sous-fifres', 'En attendant que tout le monde dorme'],
    bestAnswer: 0,
  },
  {
    id: 'mission_pourfendeur',
    title: '⚔️ Éliminer un Pourfendeur',
    description: 'Un Pourfendeur de rang inférieur a été repéré. Muzan ordonne son élimination.',
    difficulty: '⭐⭐ Moyen',
    xpReward: 150,
    progressReward: 25,
    question: 'Quelle est ta stratégie pour le vaincre ?',
    options: ['Exploiter ses angles morts avec ta régénération', 'L\'affronter directement à découvert', 'Fuir et attendre la nuit suivante', 'Piéger ses proches pour le distraire'],
    bestAnswer: 0,
  },
  {
    id: 'mission_ressources',
    title: '🌙 Chasse nocturne',
    description: 'Tu as faim. Plusieurs cibles humaines sont disponibles dans la ville. Chasse sans te faire repérer.',
    difficulty: '⭐ Facile',
    xpReward: 60,
    progressReward: 10,
    question: 'Quelle cible choisis-tu ?',
    options: ['Un isolé loin de la foule', 'Un groupe nombreux pour plus de pouvoir', 'Un enfant (trop risqué, Pourfendeurs alentour)', 'Tu ignores la mission'],
    bestAnswer: 0,
  },
  {
    id: 'mission_territoire',
    title: '💀 Défendre ton territoire',
    description: 'Un autre démon empiète sur ton territoire. Montre-lui qui règne.',
    difficulty: '⭐⭐ Moyen',
    xpReward: 130,
    progressReward: 20,
    question: 'Comment tu règles le problème ?',
    options: ['Démonstration de force écrasante pour le faire fuir', 'Négociation et alliance', 'Tu l\'ignores', 'Tu alertes Muzan'],
    bestAnswer: 0,
  },
  {
    id: 'mission_lune',
    title: '🌑 Mission des Lunes Décroissantes',
    description: 'Muzan te confie une mission spéciale réservée aux démons d\'élite. Prouve ta valeur.',
    difficulty: '⭐⭐⭐ Difficile',
    xpReward: 250,
    progressReward: 40,
    question: 'Face à un Pilier, quelle est ta tactique ?',
    options: ['Attaquer en exploitant chaque faille de sa technique', 'Fuir pour te régénérer puis contre-attaquer', 'Utiliser ton Art Sanguinaire pour le déstabiliser', 'Créer des illusions pour le piéger'],
    bestAnswer: 2,
  },
  {
    id: 'mission_sang',
    title: '🩸 Absorber du pouvoir',
    description: 'En absorbant du sang d\'un démon plus puissant, tu peux augmenter ta force. La cible a été identifiée.',
    difficulty: '⭐⭐⭐ Difficile',
    xpReward: 200,
    progressReward: 35,
    question: 'Comment tu procèdes ?',
    options: ['Attaque surprise quand il est affaibli', 'Défi en combat loyal', 'Alliance puis trahison', 'Tu demandes sa permission'],
    bestAnswer: 0,
  },
  {
    id: 'mission_forteresse',
    title: '🔮 Prendre le contrôle d\'une forteresse',
    description: 'Une forteresse humaine sert de base aux Pourfendeurs locaux. Muzan veut qu\'elle tombe.',
    difficulty: '⭐⭐⭐ Difficile',
    xpReward: 220,
    progressReward: 35,
    question: 'Comment tu vas la prendre ?',
    options: ['Infiltration de nuit en utilisant les ombres', 'Assaut frontal avec d\'autres démons', 'Corrompre un humain de l\'intérieur', 'Créer des distractions aux alentours'],
    bestAnswer: 0,
  },
];

// Sessions actives de mission
const activeMissions = new Map();

async function createMissionPanel(channel) {
  const messages = await channel.messages.fetch({ limit: 20 });
  const old = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Missions'));
  if (old) await old.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('🌑 Missions des Démons')
    .setDescription(
      'Sers Muzan Kibutsuji et accomplis les missions qui te sont confiées.\n\n' +
      '⭐ **Facile** — 60–80 XP + progression\n' +
      '⭐⭐ **Moyen** — 130–150 XP + progression\n' +
      '⭐⭐⭐ **Difficile** — 200–250 XP + progression\n\n' +
      'Les missions réussies augmentent ta progression vers un **Art Sanguinaire**.\n' +
      '*Une nouvelle mission est générée à chaque tirage.*'
    )
    .setColor(0x8B0000)
    .setFooter({ text: 'Castel Univers • Royaume des Démons' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mission_draw')
      .setLabel('Tirer une mission')
      .setEmoji('🩸')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleMissionButton(interaction) {
  const { customId, user, guild, member } = interaction;

  // Réservé aux Démons
  const isDemon = member.roles.cache.some(r => r.name === '👹 Démons');
  if (!isDemon) {
    return interaction.reply({
      content: '❌ Seuls les membres de la faction **👹 Démons** peuvent accepter des missions.',
      ephemeral: true,
    });
  }

  if (customId === 'mission_draw') {
    return drawMission(interaction);
  }
  if (customId.startsWith('mission_answer_')) {
    return handleMissionAnswer(interaction);
  }
}

async function drawMission(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const mission = DEMON_MISSIONS[Math.floor(Math.random() * DEMON_MISSIONS.length)];
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  activeMissions.set(sessionKey, { mission, started: Date.now() });

  const buttons = mission.options.map((opt, i) =>
    new ButtonBuilder()
      .setCustomId(`mission_answer_${i}`)
      .setLabel(opt.length > 80 ? opt.slice(0, 77) + '…' : opt)
      .setStyle(ButtonStyle.Secondary)
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
  }

  await interaction.editReply({
    embeds: [{
      title: mission.title,
      description:
        `${mission.difficulty} • 🏆 **${mission.xpReward} XP** • ⚡ +${mission.progressReward} progression\n\n` +
        `${mission.description}\n\n**${mission.question}**`,
      color: 0x8B0000,
      footer: { text: 'Choisis ta stratégie — tu as 60 secondes' },
    }],
    components: rows,
  });
}

async function handleMissionAnswer(interaction) {
  await interaction.deferUpdate();

  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeMissions.get(sessionKey);
  if (!session) {
    return interaction.editReply({ content: '❌ Aucune mission active. Tire une nouvelle mission.', components: [] });
  }

  activeMissions.delete(sessionKey);
  const { mission } = session;
  const chosen = parseInt(interaction.customId.split('_')[2]);
  const isCorrect = chosen === mission.bestAnswer;

  const userData = getUser(interaction.user.id, interaction.guild.id);

  if (isCorrect) {
    const newXP = userData.xp + mission.xpReward;
    const newProgress = userData.training_progress + mission.progressReward;
    updateUser(interaction.user.id, interaction.guild.id, {
      xp: newXP,
      training_progress: newProgress,
    });

    addLog(interaction.guild.id, interaction.user.id, 'MISSION_SUCCESS',
      `Mission "${mission.title}" réussie (+${mission.xpReward} XP, +${mission.progressReward} progression)`);

    // Vérifie si un Art Sanguinaire peut être attribué
    if (!userData.souffle) {
      await checkDemonArtAttribution(interaction, newProgress);
    }

    await sendLog(interaction.guild, {
      title: '🩸 Mission accomplie',
      description: `${interaction.member} a accompli **${mission.title}** (+${mission.xpReward} XP)`,
      color: 0x8B0000,
    });

    await interaction.editReply({
      embeds: [{
        title: '✅ Mission accomplie !',
        description:
          `Stratégie parfaite ! Muzan est satisfait.\n\n` +
          `+**${mission.xpReward} XP** • +**${mission.progressReward}** progression\n` +
          `Progression totale vers un Art Sanguinaire : **${newProgress}**`,
        color: 0x8B0000,
      }],
      components: [],
    });
  } else {
    const partialXP = Math.floor(mission.xpReward * 0.3);
    updateUser(interaction.user.id, interaction.guild.id, { xp: userData.xp + partialXP });

    await interaction.editReply({
      embeds: [{
        title: '❌ Mauvaise stratégie',
        description:
          `La mission a échoué. Muzan est déçu...\n\n` +
          `La bonne stratégie était : **${mission.options[mission.bestAnswer]}**\n\n` +
          `+${partialXP} XP quand même pour l\'effort.`,
        color: 0xFF4500,
      }],
      components: [],
    });
  }
}

async function checkDemonArtAttribution(interaction, progress) {
  const { user, guild, member } = interaction;

  const eligibles = DEMON_ARTS.filter(a => progress >= a.req);
  if (eligibles.length === 0) return;

  const art = eligibles[Math.floor(Math.random() * eligibles.length)];
  const role = guild.roles.cache.find(r => r.name === art.name);
  if (role) await member.roles.add(role, 'Art Sanguinaire obtenu').catch(() => {});

  updateUser(user.id, guild.id, { souffle: art.name });
  addLog(guild.id, user.id, 'DEMON_ART_OBTAINED', `${user.tag} a obtenu ${art.name}`);

  await sendLog(guild, {
    title: '🩸 Art Sanguinaire éveillé !',
    description: `${member} a obtenu **${art.name}** !`,
    color: 0x8B0000,
  });

  await interaction.channel.send({
    embeds: [{
      title: '🎊 Un Art Sanguinaire s\'éveille !',
      description: `${member} a éveillé **${art.name}** ! Muzan reconnaît sa puissance.`,
      color: 0x8B0000,
    }],
  }).catch(() => {});
}

module.exports = { createMissionPanel, handleMissionButton };
