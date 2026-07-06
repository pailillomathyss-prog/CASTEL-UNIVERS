const { handleFactionButton } = require('../panels/rolePanel');
const { handleTrainingButton } = require('../panels/trainingPanel');

module.exports = async function interactionCreate(client, interaction) {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  try {
    // Boutons de faction
    if (customId.startsWith('faction_')) {
      return await handleFactionButton(interaction);
    }

    // Boutons d'entraînement
    if (customId.startsWith('train_')) {
      return await handleTrainingButton(interaction);
    }
  } catch (err) {
    console.error(`Erreur interaction (${customId}) :`, err);
    const reply = { content: '❌ Une erreur est survenue. Réessayez.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
};
