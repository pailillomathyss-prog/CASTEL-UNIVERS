const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUser, updateUser, addLog } = require('../database/db');
const { sendLog } = require('../utils/logger');
const { FACTION_ROLES } = require('../setup/roles');

async function createRolePanel(channel) {
  // Supprime l'ancien panel s'il existe
  const messages = await channel.messages.fetch({ limit: 20 });
  const oldPanel = messages.find(m => m.author.bot && m.embeds.length > 0 &&
    m.embeds[0]?.title?.includes('Choisis ton chemin'));
  if (oldPanel) await oldPanel.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Choisis ton chemin')
    .setDescription(
      'Rejoins une faction et forge ton destin dans l\'univers de Demon Slayer.\n\n' +
      '⚔️ **Corps des Pourfendeurs** — Combats les démons et protège l\'humanité\n' +
      '👹 **Démons** — Sers Muzan Kibutsuji et répands la terreur\n' +
      '🌸 **Civil** — Vis ta vie paisiblement en marge du conflit\n\n' +
      '*Tu peux changer de faction à tout moment.*'
    )
    .setColor(0x4169E1)
    .setFooter({ text: 'Castel Univers • Choix de faction' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('faction_pourfendeur')
      .setLabel('Pourfendeur')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('faction_demon')
      .setLabel('Démon')
      .setEmoji('👹')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('faction_civil')
      .setLabel('Civil')
      .setEmoji('🌸')
      .setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

const FACTION_MAP = {
  faction_pourfendeur: '⚔️ Corps des Pourfendeurs',
  faction_demon:       '👹 Démons',
  faction_civil:       '🌸 Civil',
};

async function handleFactionButton(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const faction = FACTION_MAP[interaction.customId];
  if (!faction) return;

  const member = interaction.member;
  const guild  = interaction.guild;

  // Retire toutes les anciennes factions
  for (const factionName of FACTION_ROLES) {
    const role = guild.roles.cache.find(r => r.name === factionName);
    if (role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'Changement de faction').catch(() => {});
    }
  }

  // Ajoute la nouvelle faction
  const newRole = guild.roles.cache.find(r => r.name === faction);
  if (!newRole) {
    return interaction.editReply({ content: '❌ Le rôle de faction est introuvable. Contactez un administrateur.' });
  }

  await member.roles.add(newRole, 'Choix de faction').catch(() => {});

  // Retire "Nouveau membre" si présent
  const nouveauRole = guild.roles.cache.find(r => r.name === '🌸 Nouveau membre');
  if (nouveauRole && member.roles.cache.has(nouveauRole.id)) {
    await member.roles.remove(nouveauRole).catch(() => {});
  }

  // Sauvegarde en base
  updateUser(member.id, guild.id, { faction });
  addLog(guild.id, member.id, 'FACTION_CHANGE', `Rejoint ${faction}`);

  // Log dans Discord
  await sendLog(guild, {
    title: '🎴 Changement de faction',
    description: `${member} a rejoint **${faction}**`,
    color: 0x4169E1,
  });

  const emojis = { '⚔️ Corps des Pourfendeurs': '⚔️', '👹 Démons': '👹', '🌸 Civil': '🌸' };

  await interaction.editReply({
    content: `${emojis[faction]} Tu as rejoint **${faction}** ! Bonne chance dans ton chemin.`,
  });
}

module.exports = { createRolePanel, handleFactionButton };
