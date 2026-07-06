// Définition de tous les rôles Demon Slayer avec leurs couleurs
const ROLES = [
  // ── Arrivée ──────────────────────────────────────────────────
  { name: '🌸 Nouveau membre', color: 0xFFB6C1, hoist: false, mentionable: false },

  // ── Factions ─────────────────────────────────────────────────
  { name: '⚔️ Corps des Pourfendeurs', color: 0x4169E1, hoist: true, mentionable: true },
  { name: '👹 Démons',                 color: 0x8B0000, hoist: true, mentionable: true },
  { name: '🌸 Civil',                  color: 0x90EE90, hoist: false, mentionable: true },

  // ── Souffles ─────────────────────────────────────────────────
  { name: '🌊 Souffle de l\'Eau',     color: 0x1E90FF, hoist: false, mentionable: false },
  { name: '🔥 Souffle de la Flamme', color: 0xFF4500, hoist: false, mentionable: false },
  { name: '⚡ Souffle de la Foudre', color: 0xFFD700, hoist: false, mentionable: false },
  { name: '🌪️ Souffle du Vent',      color: 0x98FB98, hoist: false, mentionable: false },
  { name: '🌫️ Souffle de la Brume', color: 0xB0C4DE, hoist: false, mentionable: false },
  { name: '🌸 Souffle de l\'Amour',  color: 0xFF69B4, hoist: false, mentionable: false },
  { name: '🦋 Souffle de l\'Insecte',color: 0x9370DB, hoist: false, mentionable: false },
  { name: '🐍 Souffle du Serpent',   color: 0x2E8B57, hoist: false, mentionable: false },
  { name: '🪨 Souffle de la Roche',  color: 0x8B7355, hoist: false, mentionable: false },
  { name: '☀️ Souffle du Soleil',    color: 0xFF8C00, hoist: false, mentionable: false },
];

const FACTION_ROLES = ['⚔️ Corps des Pourfendeurs', '👹 Démons', '🌸 Civil'];

const SOUFFLE_ROLES = [
  '🌊 Souffle de l\'Eau',
  '🔥 Souffle de la Flamme',
  '⚡ Souffle de la Foudre',
  '🌪️ Souffle du Vent',
  '🌫️ Souffle de la Brume',
  '🌸 Souffle de l\'Amour',
  '🦋 Souffle de l\'Insecte',
  '🐍 Souffle du Serpent',
  '🪨 Souffle de la Roche',
  '☀️ Souffle du Soleil',
];

// Progression requise par souffle
const SOUFFLE_REQUIREMENTS = {
  '🌊 Souffle de l\'Eau':      100,
  '🔥 Souffle de la Flamme':  100,
  '⚡ Souffle de la Foudre':  120,
  '🌪️ Souffle du Vent':       120,
  '🌫️ Souffle de la Brume':  150,
  '🌸 Souffle de l\'Amour':   150,
  '🦋 Souffle de l\'Insecte': 200,
  '🐍 Souffle du Serpent':    200,
  '🪨 Souffle de la Roche':   200,
  '☀️ Souffle du Soleil':     300,
};

async function createRoles(guild) {
  const created = {};
  const existing = guild.roles.cache;

  for (const roleDef of ROLES) {
    // Vérifie si le rôle existe déjà
    const exists = existing.find(r => r.name === roleDef.name);
    if (exists) {
      created[roleDef.name] = exists;
      continue;
    }
    try {
      const role = await guild.roles.create({
        name: roleDef.name,
        color: roleDef.color,
        hoist: roleDef.hoist,
        mentionable: roleDef.mentionable,
        reason: 'Installation Castel Univers',
      });
      created[roleDef.name] = role;
      console.log(`✅ Rôle créé : ${roleDef.name}`);
    } catch (err) {
      console.error(`❌ Erreur création rôle ${roleDef.name} :`, err.message);
    }
  }

  return created;
}

module.exports = { ROLES, FACTION_ROLES, SOUFFLE_ROLES, SOUFFLE_REQUIREMENTS, createRoles };
