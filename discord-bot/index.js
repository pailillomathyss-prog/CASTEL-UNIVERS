require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { initDB } = require('./src/database/db');
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

// Initialise la base de données
initDB();

// Attacher le client aux events
client.on('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  console.log(`📡 Connecté sur ${client.guilds.cache.size} serveur(s)`);
  client.user.setActivity('⚔️ Demon Slayer | !rank', { type: 3 });
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
