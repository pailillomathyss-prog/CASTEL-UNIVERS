const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUser, updateUser, addLog, hasUsedDailyQuota, markDailyUsed } = require('../database/db');
const { sendLog } = require('../utils/logger');
const { SOUFFLE_REQUIREMENTS } = require('../setup/roles');

// Pool de questions par épreuve
const QUIZ_QUESTIONS = [
  { q: 'Quel est le vrai nom de Tanjiro Kamado ?', options: ['Tanjiro Kamado', 'Zenitsu Agatsuma', 'Inosuke Hashibira', 'Muzan Kibutsuji'], answer: 0 },
  { q: 'Qui est le Pilier de l\'Eau ?', options: ['Giyu Tomioka', 'Kyojuro Rengoku', 'Tengen Uzui', 'Shinobu Kocho'], answer: 0 },
  { q: 'Quel souffle Tanjiro maîtrise-t-il en premier ?', options: ['Eau', 'Flamme', 'Soleil', 'Vent'], answer: 0 },
  { q: 'Comment s\'appelle la sœur de Tanjiro ?', options: ['Nezuko', 'Aoi', 'Kanao', 'Shinobu'], answer: 0 },
  { q: 'Quel est le titre du chef des Démons ?', options: ['Roi des Démons', 'Seigneur Muzan', 'Maître Kibutsuji', 'Grand Démon'], answer: 1 },
  { q: 'Combien y a-t-il de Lunes décroissantes ?', options: ['6', '8', '12', '10'], answer: 0 },
  { q: 'Quel métal coupe les démons ?', options: ['Wisteria', 'Ore de Soleil', 'Argent', 'Fer de lune'], answer: 1 },
  { q: 'Quel personnage imite des animaux ?', options: ['Inosuke', 'Zenitsu', 'Tanjiro', 'Aoi'], answer: 0 },
];

const MEMORY_SEQUENCES = [
  { sequence: '🌊 🔥 ⚡', choices: ['🌊 🔥 ⚡', '🔥 🌊 ⚡', '⚡ 🔥 🌊', '🌊 ⚡ 🔥'], answer: 0 },
  { sequence: '⚔️ 🌸 👹', choices: ['👹 ⚔️ 🌸', '⚔️ 🌸 👹', '🌸 ⚔️ 👹', '👹 🌸 ⚔️'], answer: 1 },
  { sequence: '🪨 🦋 🐍', choices: ['🦋 🪨 🐍', '🪨 🐍 🦋', '🪨 🦋 🐍', '🐍 🦋 🪨'], answer: 2 },
];

const COMBAT_SCENARIOS = [
  {
    q: 'Un démon t\'attaque par derrière. Que fais-tu ?',
    options: ['Tu fuis', 'Tu utilises ton Souffle pour parer', 'Tu attends de l\'aide', 'Tu négocias'],
    answer: 1, points: 15,
  },
  {
    q: 'Tu dois choisir une technique. Laquelle est la plus efficace contre la régénération rapide ?',
    options: ['Attaque lente et puissante', 'Trancher la tête en un seul coup', 'Frapper le corps', 'Attendre'],
    answer: 1, points: 20,
  },
  {
    q: 'Un civil est en danger. Tu dois gérer deux démons. Que fais-tu ?',
    options: ['Mettre le civil en sécurité d\'abord', 'Attaquer les deux démons immédiatement', 'Appeler des renforts', 'Abandonner'],
    answer: 0, points: 10,
  },
];

// Sessions actives d'entraînement (en mémoire)
const activeSessions = new Map();

async function createTrainingPanel(channel) {
  const messages = await channel.messages.fetch({ limit: 20 });
  const old = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Entraînement'));
  if (old) await old.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('🔥 Entraînement des souffles')
    .setDescription(
      'Prouve ta valeur pour mériter un Souffle !\n\n' +
      '📜 **Quiz Demon Slayer** — Teste tes connaissances\n' +
      '⚡ **Test de rapidité** — Réagis vite\n' +
      '🧠 **Test de mémoire** — Mémorise les séquences\n' +
      '⚔️ **Combat** — Fais les bons choix tactiques\n\n' +
      'Chaque épreuve réussie augmente ta progression.\n' +
      'Atteins le seuil requis pour recevoir un **Souffle**.'
    )
    .setColor(0xFF4500)
    .setFooter({ text: 'Castel Univers • Entraînement des Souffles' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('train_start')
      .setLabel('Commencer l\'entraînement')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleTrainingButton(interaction) {
  const { customId, user, guild } = interaction;

  if (customId === 'train_start') {
    return startTraining(interaction);
  }
  if (customId.startsWith('train_quiz_')) {
    return handleQuizAnswer(interaction);
  }
  if (customId.startsWith('train_memory_')) {
    return handleMemoryAnswer(interaction);
  }
  if (customId.startsWith('train_combat_')) {
    return handleCombatAnswer(interaction);
  }
  if (customId === 'train_speed') {
    return handleSpeedAnswer(interaction);
  }
}

async function startTraining(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // ── Limite 1 entraînement par jour ───────────────────────────
  if (hasUsedDailyQuota(interaction.user.id, interaction.guild.id, 'training')) {
    const now = new Date();
    const msUntilMidnight = new Date(now.toISOString().slice(0, 10) + 'T24:00:00Z') - now;
    const h = Math.floor(msUntilMidnight / 3600000);
    const m = Math.floor((msUntilMidnight % 3600000) / 60000);
    return interaction.editReply({
      embeds: [{
        title: '⚔️ Entraînement terminé pour aujourd\'hui',
        description:
          `Tu as déjà accompli ton entraînement quotidien.\n\n` +
          `⏳ Prochain entraînement disponible dans **${h}h ${m}min**.\n` +
          `*Le repos fait partie de la discipline du Pourfendeur.*`,
        color: 0xFF4500,
        footer: { text: 'Castel Univers • Corps des Pourfendeurs' },
      }],
    });
  }

  const userData = getUser(interaction.user.id, interaction.guild.id);

  // Tire aléatoirement une épreuve
  const epreuves = ['quiz', 'speed', 'memory', 'combat'];
  const epreuve = epreuves[Math.floor(Math.random() * epreuves.length)];

  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;

  if (epreuve === 'quiz') {
    const question = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
    activeSessions.set(sessionKey, { type: 'quiz', answer: question.answer, started: Date.now() });

    const buttons = question.options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`train_quiz_${i}`)
        .setLabel(opt)
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
    }

    return interaction.editReply({
      embeds: [{
        title: '📜 Quiz Demon Slayer',
        description: `**${question.q}**\n\nChoisis la bonne réponse :`,
        color: 0x4169E1,
        footer: { text: 'Tu as 30 secondes pour répondre !' },
      }],
      components: rows,
    });
  }

  if (epreuve === 'speed') {
    const delay = Math.floor(Math.random() * 5000) + 2000;
    activeSessions.set(sessionKey, { type: 'speed', started: null, delay });

    await interaction.editReply({
      embeds: [{
        title: '⚡ Test de rapidité',
        description: 'Prépare-toi… Clique sur **FRAPPE !** dès qu\'il apparaît !',
        color: 0xFFD700,
      }],
    });

    setTimeout(async () => {
      const session = activeSessions.get(sessionKey);
      if (session && !session.started) {
        session.started = Date.now();
        activeSessions.set(sessionKey, session);
        await interaction.editReply({
          embeds: [{ title: '⚡ MAINTENANT !', description: 'Clique vite !', color: 0xFF0000 }],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('train_speed').setLabel('⚡ FRAPPE !').setStyle(ButtonStyle.Danger)
          )],
        });
      }
    }, delay);

    return;
  }

  if (epreuve === 'memory') {
    const seq = MEMORY_SEQUENCES[Math.floor(Math.random() * MEMORY_SEQUENCES.length)];
    activeSessions.set(sessionKey, { type: 'memory', answer: seq.answer });

    await interaction.editReply({
      embeds: [{
        title: '🧠 Test de mémoire',
        description: `Mémorise cette séquence :\n\n# ${seq.sequence}\n\n*Elle disparaîtra dans 5 secondes…*`,
        color: 0x9370DB,
      }],
    });

    setTimeout(async () => {
      const buttons = seq.choices.map((opt, i) =>
        new ButtonBuilder().setCustomId(`train_memory_${i}`).setLabel(opt).setStyle(ButtonStyle.Secondary)
      );
      const rows = [];
      for (let i = 0; i < buttons.length; i += 2) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
      }
      await interaction.editReply({
        embeds: [{ title: '🧠 Quelle était la bonne séquence ?', color: 0x9370DB }],
        components: rows,
      });
    }, 5000);

    return;
  }

  if (epreuve === 'combat') {
    const scenario = COMBAT_SCENARIOS[Math.floor(Math.random() * COMBAT_SCENARIOS.length)];
    activeSessions.set(sessionKey, { type: 'combat', answer: scenario.answer, points: scenario.points });

    const buttons = scenario.options.map((opt, i) =>
      new ButtonBuilder().setCustomId(`train_combat_${i}`).setLabel(opt).setStyle(ButtonStyle.Secondary)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
    }

    return interaction.editReply({
      embeds: [{
        title: '⚔️ Combat — Scénario tactique',
        description: `**${scenario.q}**`,
        color: 0x8B0000,
        footer: { text: 'Choisis ta stratégie' },
      }],
      components: rows,
    });
  }
}

async function resolveAnswer(interaction, isCorrect, points = 10) {
  const { user, guild } = interaction;
  const sessionKey = `${user.id}-${guild.id}`;
  activeSessions.delete(sessionKey);

  const userData = getUser(user.id, guild.id);

  if (isCorrect) {
    const newProgress = userData.training_progress + points;
    updateUser(user.id, guild.id, { training_progress: newProgress });
    // Marque l'entraînement du jour comme utilisé
    markDailyUsed(user.id, guild.id, 'training');
    addLog(guild.id, user.id, 'TRAINING_SUCCESS', `+${points} progression (total: ${newProgress})`);

    // Vérifie si un souffle peut être attribué
    if (!userData.souffle) {
      await checkSouffleAttribution(interaction, newProgress);
    }

    await interaction.editReply({
      embeds: [{
        title: '✅ Bonne réponse !',
        description: `+${points} points de progression !\nProgression totale : **${newProgress}**`,
        color: 0x00FF00,
      }],
      components: [],
    });
  } else {
    await interaction.editReply({
      embeds: [{
        title: '❌ Mauvaise réponse',
        description: 'Continue à t\'entraîner, tu y arriveras !',
        color: 0xFF0000,
      }],
      components: [],
    });
  }
}

async function checkSouffleAttribution(interaction, progress) {
  const { user, guild } = interaction;

  // Souffles éligibles selon la progression
  const eligibles = Object.entries(SOUFFLE_REQUIREMENTS)
    .filter(([, req]) => progress >= req)
    .map(([name]) => name);

  if (eligibles.length === 0) return;

  // Attribue un souffle aléatoire parmi les éligibles
  const souffle = eligibles[Math.floor(Math.random() * eligibles.length)];

  // Ajoute le rôle
  const role = guild.roles.cache.find(r => r.name === souffle);
  if (role) {
    await interaction.member.roles.add(role, 'Souffle obtenu par entraînement').catch(() => {});
  }

  updateUser(user.id, guild.id, { souffle });
  addLog(guild.id, user.id, 'SOUFFLE_OBTAINED', `${user.tag} a obtenu ${souffle}`);

  await sendLog(guild, {
    title: '🌬️ Souffle obtenu !',
    description: `${interaction.member} a obtenu **${souffle}** après son entraînement !`,
    color: 0xFF8C00,
  });

  // Annonce dans le canal
  await interaction.channel.send({
    embeds: [{
      title: '🎊 Un nouveau Souffle est né !',
      description: `Félicitations à ${interaction.member} qui a obtenu **${souffle}** !`,
      color: 0xFF8C00,
    }],
  });
}

async function handleQuizAnswer(interaction) {
  await interaction.deferUpdate();
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeSessions.get(sessionKey);
  if (!session || session.type !== 'quiz') return;

  const chosen = parseInt(interaction.customId.split('_')[2]);
  await resolveAnswer(interaction, chosen === session.answer);
}

async function handleSpeedAnswer(interaction) {
  await interaction.deferUpdate();
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeSessions.get(sessionKey);
  if (!session || session.type !== 'speed' || !session.started) return;

  const ms = Date.now() - session.started;
  const isGood = ms < 1500;
  await resolveAnswer(interaction, isGood, isGood ? 15 : 5);

  if (isGood) {
    await interaction.editReply({
      embeds: [{
        title: '⚡ Excellent réflexe !',
        description: `Tu as répondu en **${ms}ms** ! +15 progression`,
        color: 0xFFD700,
      }],
      components: [],
    });
  } else {
    await interaction.editReply({
      embeds: [{
        title: '⚡ Un peu lent…',
        description: `${ms}ms — Entraîne-toi encore !`,
        color: 0xFF6600,
      }],
      components: [],
    });
  }
}

async function handleMemoryAnswer(interaction) {
  await interaction.deferUpdate();
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeSessions.get(sessionKey);
  if (!session || session.type !== 'memory') return;

  const chosen = parseInt(interaction.customId.split('_')[2]);
  await resolveAnswer(interaction, chosen === session.answer, 12);
}

async function handleCombatAnswer(interaction) {
  await interaction.deferUpdate();
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeSessions.get(sessionKey);
  if (!session || session.type !== 'combat') return;

  const chosen = parseInt(interaction.customId.split('_')[2]);
  await resolveAnswer(interaction, chosen === session.answer, session.points || 10);
}

module.exports = { createTrainingPanel, handleTrainingButton };
