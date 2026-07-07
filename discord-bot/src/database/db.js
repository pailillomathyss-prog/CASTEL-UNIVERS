const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'castel-univers.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id           TEXT NOT NULL,
      guild_id          TEXT NOT NULL,
      xp                INTEGER DEFAULT 0,
      level             INTEGER DEFAULT 1,
      faction           TEXT DEFAULT NULL,
      souffle           TEXT DEFAULT NULL,
      training_progress INTEGER DEFAULT 0,
      last_xp           INTEGER DEFAULT 0,
      last_training     TEXT DEFAULT NULL,
      last_mission      TEXT DEFAULT NULL,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id  TEXT NOT NULL,
      user_id   TEXT NOT NULL,
      action    TEXT NOT NULL,
      details   TEXT,
      timestamp INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS guilds (
      guild_id                 TEXT PRIMARY KEY,
      log_channel_id           TEXT DEFAULT NULL,
      leaderboard_channel_id   TEXT DEFAULT NULL,
      leaderboard_message_id   TEXT DEFAULT NULL,
      installed                INTEGER DEFAULT 0,
      installed_at             INTEGER DEFAULT NULL
    );
  `);
  console.log('📦 Base de données initialisée');
}

// Migration v1.5 — ajoute les colonnes de cooldown journalier + leaderboard persisté
function migrateV15() {
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('last_training')) {
    db.exec("ALTER TABLE users ADD COLUMN last_training TEXT DEFAULT NULL");
    console.log('✅ Migration v1.5 : colonne last_training ajoutée');
  }
  if (!userCols.includes('last_mission')) {
    db.exec("ALTER TABLE users ADD COLUMN last_mission TEXT DEFAULT NULL");
    console.log('✅ Migration v1.5 : colonne last_mission ajoutée');
  }

  const guildCols = db.prepare("PRAGMA table_info(guilds)").all().map(c => c.name);
  if (!guildCols.includes('leaderboard_channel_id')) {
    db.exec("ALTER TABLE guilds ADD COLUMN leaderboard_channel_id TEXT DEFAULT NULL");
    console.log('✅ Migration v1.5 : colonne leaderboard_channel_id ajoutée');
  }
  if (!guildCols.includes('leaderboard_message_id')) {
    db.exec("ALTER TABLE guilds ADD COLUMN leaderboard_message_id TEXT DEFAULT NULL");
    console.log('✅ Migration v1.5 : colonne leaderboard_message_id ajoutée');
  }
}

// Retourne la date du jour en format YYYY-MM-DD (UTC)
function today() {
  return new Date().toISOString().slice(0, 10);
}

// Vérifie si l'utilisateur a déjà utilisé son quota du jour
// type = 'training' | 'mission'
function hasUsedDailyQuota(userId, guildId, type) {
  const user = getUser(userId, guildId);
  const col = type === 'mission' ? 'last_mission' : 'last_training';
  return user[col] === today();
}

// Marque la date du jour pour le quota
function markDailyUsed(userId, guildId, type) {
  const col = type === 'mission' ? 'last_mission' : 'last_training';
  db.prepare(`UPDATE users SET ${col} = ? WHERE user_id = ? AND guild_id = ?`)
    .run(today(), userId, guildId);
}

// ─── Utilisateurs ───────────────────────────────────────────────
function getUser(userId, guildId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return user;
}

function updateUser(userId, guildId, data) {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  db.prepare(`UPDATE users SET ${fields} WHERE user_id = ? AND guild_id = ?`).run(...values, userId, guildId);
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare(
    'SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'
  ).all(guildId, limit);
}

// ─── Logs ────────────────────────────────────────────────────────
function addLog(guildId, userId, action, details = '') {
  db.prepare('INSERT INTO logs (guild_id, user_id, action, details) VALUES (?, ?, ?, ?)').run(guildId, userId, action, details);
}

// ─── Guilds ──────────────────────────────────────────────────────
function getGuild(guildId) {
  let g = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
  if (!g) {
    db.prepare('INSERT INTO guilds (guild_id) VALUES (?)').run(guildId);
    g = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
  }
  return g;
}

function setGuildLog(guildId, channelId) {
  db.prepare('UPDATE guilds SET log_channel_id = ? WHERE guild_id = ?').run(channelId, guildId);
}

function setGuildInstalled(guildId) {
  db.prepare(
    'UPDATE guilds SET installed = 1, installed_at = strftime(\'%s\',\'now\') WHERE guild_id = ?'
  ).run(guildId);
}

function setLeaderboardMessage(guildId, channelId, messageId) {
  db.prepare(
    'UPDATE guilds SET leaderboard_channel_id = ?, leaderboard_message_id = ? WHERE guild_id = ?'
  ).run(channelId, messageId, guildId);
}

module.exports = { initDB, migrateV15, getUser, updateUser, getLeaderboard, addLog, getGuild, setGuildLog, setGuildInstalled, setLeaderboardMessage, hasUsedDailyQuota, markDailyUsed, today };
