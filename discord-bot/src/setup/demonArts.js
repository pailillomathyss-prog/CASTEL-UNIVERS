// Arts Sanguinaires — équivalent des Souffles pour les Démons
const DEMON_ARTS = [
  { name: '🩸 Art Sanguinaire : Araignée',         color: 0x8B0000, req: 100 },
  { name: '🌙 Art Sanguinaire : Lune',              color: 0x191970, req: 100 },
  { name: '🧵 Art Sanguinaire : Fil',               color: 0xDC143C, req: 120 },
  { name: '💀 Art Sanguinaire : Os',                color: 0xF5F5DC, req: 120 },
  { name: '🔮 Art Sanguinaire : Illusion',          color: 0x6A0DAD, req: 150 },
  { name: '❄️ Art Sanguinaire : Glace',             color: 0xADD8E6, req: 150 },
  { name: '🌊 Art Sanguinaire : Vague de Sang',     color: 0x8B0000, req: 200 },
  { name: '🎨 Art Sanguinaire : Peinture',          color: 0xFF4500, req: 200 },
  { name: '👁️ Art Sanguinaire : Œil Omniscient',   color: 0xFFD700, req: 250 },
  { name: '🌑 Art Sanguinaire : Lune Décroissante', color: 0x0D0D0D, req: 300 },
];

const DEMON_ART_COLORS = {
  '🩸 Art Sanguinaire : Araignée':          { primary: '#8B0000', secondary: '#DC143C', glow: '#FF6B6B' },
  '🌙 Art Sanguinaire : Lune':              { primary: '#191970', secondary: '#4B0082', glow: '#9370DB' },
  '🧵 Art Sanguinaire : Fil':               { primary: '#DC143C', secondary: '#FF4500', glow: '#FF6B6B' },
  '💀 Art Sanguinaire : Os':                { primary: '#C8C8C8', secondary: '#F5F5DC', glow: '#FFFFFF' },
  '🔮 Art Sanguinaire : Illusion':          { primary: '#6A0DAD', secondary: '#9B30FF', glow: '#E6E6FA' },
  '❄️ Art Sanguinaire : Glace':             { primary: '#ADD8E6', secondary: '#87CEEB', glow: '#F0F8FF' },
  '🌊 Art Sanguinaire : Vague de Sang':     { primary: '#8B0000', secondary: '#B22222', glow: '#FF6B6B' },
  '🎨 Art Sanguinaire : Peinture':          { primary: '#FF4500', secondary: '#FF6347', glow: '#FFD700' },
  '👁️ Art Sanguinaire : Œil Omniscient':   { primary: '#FFD700', secondary: '#FFA500', glow: '#FFFACD' },
  '🌑 Art Sanguinaire : Lune Décroissante': { primary: '#1a1a2e', secondary: '#16213e', glow: '#533483' },
};

async function createDemonArtRoles(guild) {
  const created = {};
  for (const art of DEMON_ARTS) {
    const exists = guild.roles.cache.find(r => r.name === art.name);
    if (exists) { created[art.name] = exists; continue; }
    try {
      const role = await guild.roles.create({
        name: art.name,
        color: art.color,
        hoist: false,
        mentionable: false,
        reason: 'Installation Arts Sanguinaires',
      });
      created[art.name] = role;
      console.log(`✅ Art Sanguinaire créé : ${art.name}`);
    } catch (err) {
      console.error(`❌ Erreur rôle ${art.name} :`, err.message);
    }
  }
  return created;
}

module.exports = { DEMON_ARTS, DEMON_ART_COLORS, createDemonArtRoles };
