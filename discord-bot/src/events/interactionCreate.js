const { handleFactionButton } = require('../panels/rolePanel');
const { handleTrainingButton } = require('../panels/trainingPanel');
const { handleDemonTrainingButton } = require('../panels/demonTrainingPanel');
const { handleMissionButton } = require('../systems/missions');

module.exports = async function interactionCreate(client, interaction) {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  try {
    // Boutons de faction
    if (customId.startsWith('faction_')) {
      return await handleFactionButton(interaction);
    }

    // Entraînement Pourfendeurs
    if (customId.startsWith('train_')) {
      return await handleTrainingButton(interaction);
    }

    // Entraînement Démons
    if (customId.startsWith('demon_train_') || customId.startsWith('demon_trial_')) {
      return await handleDemonTrainingButton(interaction);
    }

    // Missions Démons
    if (customId.startsWith('mission_')) {
      return await handleMissionButton(interaction);
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
