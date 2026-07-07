const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUser, updateUser, addLog, hasUsedDailyQuota, markDailyUsed } = require('../database/db');
const { sendLog } = require('../utils/logger');
const { DEMON_ARTS } = require('../setup/demonArts');

// Épreuves d'entraînement spécifiques aux démons
const DEMON_TRIALS = [
  {
    type: 'quiz',
    question: 'Comment un démon régénère-t-il ses membres ?',
    options: ['Grâce au sang de Muzan dans ses veines', 'En absorbant la lumière lunaire', 'En dormant le jour', 'En se nourrissant de peur'],
    answer: 0, points: 15,
  },
  {
    type: 'quiz',
    question: 'Quelle est la seule façon de tuer définitivement un démon ?',
    options: ['Décapitation par une lame en minerai de Soleil', 'Le noyer dans l\'eau', 'L\'exposer au soleil', 'Décapitation OU exposition au soleil'],
    answer: 3, points: 15,
  },
  {
    type: 'quiz',
    question: 'Qu\'est-ce que le "Kagura du Soleil de Hinokami" ?',
    options: ['Une danse ancestrale liée au Souffle du Soleil', 'Une technique des Lunes Décroissantes', 'Un art sanguinaire rare', 'Une danse rituelle civile'],
    answer: 0, points: 20,
  },
  {
    type: 'quiz',
    question: 'Combien y a-t-il de Lunes Supérieures ?',
    options: ['3', '6', '12', '9'],
    answer: 1, points: 15,
  },
  {
    type: 'combat',
    question: 'Tu affrontes un Pourfendeur de rang Kanoe. Il utilise le Souffle de l\'Eau. Que fais-tu ?',
    options: ['Attaquer en exploitant les angles morts entre ses techniques', 'Absorber ses coups avec ta régénération', 'Fuir et l\'attirer dans l\'obscurité totale', 'Utiliser un Art Sanguinaire à longue portée'],
    answer: 2, points: 25,
  },
  {
    type: 'combat',
    question: 'Ton Art Sanguinaire te permet de créer des illusions. Comment l\'utilises-tu contre un Pilier ?',
    options: ['Créer une fausse version de toi pour distraire', 'Simuler une retraite puis attaquer par derrière', 'Créer des illusions de plusieurs Pourfendeurs pour le désorienter', 'Cacher ta vraie forme et attaquer par surprise'],
    answer: 2, points: 30,
  },
];

const activeSessions = new Map();

async function createDemonTrainingPanel(channel) {
  const messages = await channel.messages.fetch({ limit: 20 });
  const old = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Entraînement Démoniaque'));
  if (old) await old.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('👹 Entraînement Démoniaque')
    .setDescription(
      'Développe tes capacités démoniaques et éveille ton **Art Sanguinaire**.\n\n' +
      '📜 **Quiz démoniaque** — Maîtrise la lore des démons\n' +
      '⚔️ **Scénarios de combat** — Choisis la bonne tactique\n\n' +
      'Chaque épreuve réussie augmente ta progression.\n' +
      'Atteins le seuil requis pour éveiller ton **Art Sanguinaire**.\n\n' +
      '*Seuls les membres de la faction **👹 Démons** peuvent s\'entraîner ici.*'
    )
    .setColor(0x8B0000)
    .setFooter({ text: 'Castel Univers • Royaume des Démons' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('demon_train_start')
      .setLabel('Commencer l\'épreuve')
      .setEmoji('👹')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleDemonTrainingButton(interaction) {
  const { customId, member } = interaction;

  // Réservé aux Démons
  const isDemon = member.roles.cache.some(r => r.name === '👹 Démons');
  if (!isDemon) {
    return interaction.reply({
      content: '❌ Cet entraînement est réservé aux membres de la faction **👹 Démons**.',
      ephemeral: true,
    });
  }

  if (customId === 'demon_train_start') return startDemonTrial(interaction);
  if (customId.startsWith('demon_trial_')) return handleTrialAnswer(interaction);
}

async function startDemonTrial(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // ── Limite 1 entraînement démoniaque par jour ─────────────────
  if (hasUsedDailyQuota(interaction.user.id, interaction.guild.id, 'training')) {
    const now = new Date();
    const msUntilMidnight = new Date(now.toISOString().slice(0, 10) + 'T24:00:00Z') - now;
    const h = Math.floor(msUntilMidnight / 3600000);
    const m = Math.floor((msUntilMidnight % 3600000) / 60000);
    return interaction.editReply({
      embeds: [{
        title: '🩸 Entraînement démoniaque terminé pour aujourd\'hui',
        description:
          `Tu as déjà accompli ton épreuve quotidienne.\n\n` +
          `⏳ Prochain entraînement disponible dans **${h}h ${m}min**.\n` +
          `*Même les démons ont besoin de patience.*`,
        color: 0x8B0000,
        footer: { text: 'Castel Univers • Royaume des Démons' },
      }],
    });
  }

  const trial = DEMON_TRIALS[Math.floor(Math.random() * DEMON_TRIALS.length)];
  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  activeSessions.set(sessionKey, { trial, started: Date.now() });

  const buttons = trial.options.map((opt, i) =>
    new ButtonBuilder()
      .setCustomId(`demon_trial_${i}`)
      .setLabel(opt.length > 80 ? opt.slice(0, 77) + '…' : opt)
      .setStyle(ButtonStyle.Secondary)
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
  }

  const typeLabel = trial.type === 'quiz' ? '📜 Quiz Démoniaque' : '⚔️ Scénario de Combat';

  await interaction.editReply({
    embeds: [{
      title: typeLabel,
      description: `**${trial.question}**\n\n+**${trial.points}** points de progression si tu réussis`,
      color: 0x8B0000,
      footer: { text: 'Choisis la bonne réponse' },
    }],
    components: rows,
  });
}

async function handleTrialAnswer(interaction) {
  await interaction.deferUpdate();

  const sessionKey = `${interaction.user.id}-${interaction.guild.id}`;
  const session = activeSessions.get(sessionKey);
  if (!session) return;

  activeSessions.delete(sessionKey);
  const { trial } = session;
  const chosen = parseInt(interaction.customId.split('_')[2]);
  const isCorrect = chosen === trial.answer;

  const userData = getUser(interaction.user.id, interaction.guild.id);

  if (isCorrect) {
    const newProgress = userData.training_progress + trial.points;
    updateUser(interaction.user.id, interaction.guild.id, { training_progress: newProgress });
    // Marque l'entraînement du jour comme utilisé
    markDailyUsed(interaction.user.id, interaction.guild.id, 'training');
    addLog(interaction.guild.id, interaction.user.id, 'DEMON_TRAINING_SUCCESS',
      `+${trial.points} progression (total: ${newProgress})`);

    // Vérifie si un Art Sanguinaire peut être attribué
    if (!userData.souffle) {
      const eligibles = DEMON_ARTS.filter(a => newProgress >= a.req);
      if (eligibles.length > 0) {
        const art = eligibles[Math.floor(Math.random() * eligibles.length)];
        const role = interaction.guild.roles.cache.find(r => r.name === art.name);
        if (role) await interaction.member.roles.add(role, 'Art Sanguinaire éveillé').catch(() => {});

        updateUser(interaction.user.id, interaction.guild.id, { souffle: art.name });
        addLog(interaction.guild.id, interaction.user.id, 'DEMON_ART_OBTAINED', art.name);

        await sendLog(interaction.guild, {
          title: '🩸 Art Sanguinaire éveillé !',
          description: `${interaction.member} a éveillé **${art.name}** !`,
          color: 0x8B0000,
        });

        await interaction.channel.send({
          embeds: [{
            title: '🎊 Un Art Sanguinaire s\'éveille !',
            description: `${interaction.member} a éveillé **${art.name}** ! Sa puissance démonique est reconnue.`,
            color: 0x8B0000,
          }],
        }).catch(() => {});
      }
    }

    await interaction.editReply({
      embeds: [{
        title: '✅ Bonne réponse !',
        description: `+**${trial.points}** points de progression !\nProgression totale : **${userData.training_progress + trial.points}**`,
        color: 0x8B0000,
      }],
      components: [],
    });
  } else {
    await interaction.editReply({
      embeds: [{
        title: '❌ Mauvaise réponse',
        description: `La bonne réponse était : **${trial.options[trial.answer]}**\n\nContinue à t\'entraîner !`,
        color: 0xFF4500,
      }],
      components: [],
    });
  }
}

module.exports = { createDemonTrainingPanel, handleDemonTrainingButton };
