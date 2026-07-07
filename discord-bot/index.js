require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { initDB, migrateV15 } = require('./src/database/db');
const { loadLeaderboardFromDB, startLeaderboardAutoRefresh } = require('./src/systems/leaderboard');
const messageCreate = require('./src/events/messageCreate');
const interactionCreate = require('./src/events/interactionCreate');
const guildMemberAdd = require('./src/events/guildMemberAdd');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// Initialise et migre la base de données
initDB();
migrateV15();

// Attacher le client aux events
client.on('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  console.log(`📡 Connecté sur ${client.guilds.cache.size} serveur(s)`);
  client.user.setActivity('⚔️ Demon Slayer | !rank', { type: 3 });

  // Charge les messages de classement persistés et démarre l'auto-refresh 60s
  loadLeaderboardFromDB(client.guilds.cache.values());
  startLeaderboardAutoRefresh(client);
  console.log('🏆 Auto-refresh du classement démarré (toutes les 60s)');
});

client.on('messageCreate', (message) => messageCreate(client, message));
client.on('interactionCreate', (interaction) => interactionCreate(client, interaction));
client.on('guildMemberAdd', (member) => guildMemberAdd(client, member));

client.on('error', (error) => {
  console.error('Erreur Discord.js :', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesse rejetée non gérée :', error);
});

client.login(process.env.DISCORD_TOKEN);
