const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Couleurs par souffle / Art Sanguinaire
const SOUFFLE_COLORS = {
  '🌊 Souffle de l\'Eau':       { primary: '#1E90FF', secondary: '#00BFFF', glow: '#87CEEB' },
  '🔥 Souffle de la Flamme':    { primary: '#FF4500', secondary: '#FF6347', glow: '#FFD700' },
  '⚡ Souffle de la Foudre':    { primary: '#FFD700', secondary: '#FFA500', glow: '#FFFACD' },
  '🌪️ Souffle du Vent':         { primary: '#98FB98', secondary: '#90EE90', glow: '#F0FFF0' },
  '🌫️ Souffle de la Brume':    { primary: '#B0C4DE', secondary: '#778899', glow: '#F0F8FF' },
  '🌸 Souffle de l\'Amour':     { primary: '#FF69B4', secondary: '#FFB6C1', glow: '#FFF0F5' },
  '🦋 Souffle de l\'Insecte':   { primary: '#9370DB', secondary: '#8A2BE2', glow: '#E6E6FA' },
  '🐍 Souffle du Serpent':      { primary: '#2E8B57', secondary: '#3CB371', glow: '#90EE90' },
  '🪨 Souffle de la Roche':     { primary: '#8B7355', secondary: '#A0522D', glow: '#DEB887' },
  '☀️ Souffle du Soleil':       { primary: '#FF8C00', secondary: '#FF6347', glow: '#FFD700' },
  // Arts Sanguinaires
  '🕷️ Art Sanguinaire: Araignée':         { primary: '#6B2D8B', secondary: '#9B30FF', glow: '#D8B4FE' },
  '🌙 Art Sanguinaire: Lune':             { primary: '#334155', secondary: '#94A3B8', glow: '#CBD5E1' },
  '🕸️ Art Sanguinaire: Fil':              { primary: '#C026D3', secondary: '#E879F9', glow: '#F0ABFC' },
  '🦴 Art Sanguinaire: Os':               { primary: '#FAFAFA', secondary: '#D4D4D4', glow: '#FFFFFF' },
  '🎭 Art Sanguinaire: Illusion':         { primary: '#7C3AED', secondary: '#A78BFA', glow: '#EDE9FE' },
  '🧊 Art Sanguinaire: Glace':            { primary: '#0EA5E9', secondary: '#7DD3FC', glow: '#E0F2FE' },
  '🌊 Art Sanguinaire: Vague de Sang':   { primary: '#BE123C', secondary: '#FB7185', glow: '#FFE4E6' },
  '🖌️ Art Sanguinaire: Peinture':         { primary: '#D97706', secondary: '#FCD34D', glow: '#FEF3C7' },
  '👁️ Art Sanguinaire: Œil Omniscient':  { primary: '#DC2626', secondary: '#F87171', glow: '#FEE2E2' },
  '🌑 Art Sanguinaire: Lune Décroissante':{ primary: '#1E1B4B', secondary: '#4338CA', glow: '#C7D2FE' },
  default: { primary: '#4169E1', secondary: '#6495ED', glow: '#ADD8E6' },
};

const FACTION_COLORS = {
  '⚔️ Corps des Pourfendeurs': '#4169E1',
  '👹 Démons':                  '#8B0000',
  '🌸 Civil':                   '#90EE90',
};

function getColor(souffle, faction) {
  if (souffle && SOUFFLE_COLORS[souffle]) return SOUFFLE_COLORS[souffle];
  if (faction && FACTION_COLORS[faction]) {
    const c = FACTION_COLORS[faction];
    return { primary: c, secondary: c, glow: c + '88' };
  }
  return SOUFFLE_COLORS.default;
}

function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateRankCard({ username, avatarUrl, level, xp, xpInLevel, xpForLevel, rank, faction, souffle, serverRank }) {
  const W = 940, H = 300;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const colors  = getColor(souffle, faction);
  const percent = Math.round(Math.min(xpInLevel / xpForLevel, 1) * 100);

  // ── Fond ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.5, '#0f0f22');
  bg.addColorStop(1, '#07071a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grille japonaise subtile
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 28) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
  for (let i = 0; i < H; i += 28) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

  // Halo de couleur en haut à droite
  const halo = ctx.createRadialGradient(W * 0.85, H * 0.2, 20, W * 0.85, H * 0.2, 280);
  halo.addColorStop(0, hexToRgba(colors.primary, 0.18));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Halo secondaire en bas à gauche
  const halo2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 10, W * 0.15, H * 0.85, 200);
  halo2.addColorStop(0, hexToRgba(colors.secondary, 0.10));
  halo2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo2;
  ctx.fillRect(0, 0, W, H);

  // Bordure arrondie principale
  drawRoundedRect(ctx, 2, 2, W - 4, H - 4, 18);
  ctx.strokeStyle = hexToRgba(colors.primary, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Barre gauche colorée
  const leftBar = ctx.createLinearGradient(0, 0, 0, H);
  leftBar.addColorStop(0, colors.primary);
  leftBar.addColorStop(0.5, colors.secondary);
  leftBar.addColorStop(1, colors.primary);
  ctx.fillStyle = leftBar;
  drawRoundedRect(ctx, 2, 2, 7, H - 4, 4);
  ctx.fill();

  // ── Avatar ───────────────────────────────────────────────────
  const AV = 130;
  const AX  = 44, AY  = H / 2 - AV / 2;
  const ACX = AX + AV / 2, ACY = AY + AV / 2;

  // Lueur derrière l'avatar
  const avGlow = ctx.createRadialGradient(ACX, ACY, 10, ACX, ACY, 90);
  avGlow.addColorStop(0, hexToRgba(colors.primary, 0.5));
  avGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = avGlow;
  ctx.beginPath(); ctx.arc(ACX, ACY, 90, 0, Math.PI * 2); ctx.fill();

  // Anneau coloré
  ctx.beginPath(); ctx.arc(ACX, ACY, AV / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(colors.primary, 0.9); ctx.fill();

  // Image avatar
  try {
    const img = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath(); ctx.arc(ACX, ACY, AV / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, AX, AY, AV, AV);
    ctx.restore();
  } catch {
    ctx.fillStyle = hexToRgba(colors.primary, 0.6);
    ctx.beginPath(); ctx.arc(ACX, ACY, AV / 2, 0, Math.PI * 2); ctx.fill();
  }

  // ── Zone texte principale ─────────────────────────────────────
  const TX = AX + AV + 28;  // début zone texte

  // Nom du membre
  ctx.font      = 'bold 34px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = hexToRgba(colors.primary, 0.9);
  ctx.shadowBlur  = 12;
  ctx.fillText(username, TX, 66);
  ctx.shadowBlur  = 0;

  // Rang / titre
  ctx.font      = '17px sans-serif';
  ctx.fillStyle = hexToRgba(colors.primary, 1);
  ctx.fillText(rank, TX, 96);

  // Faction
  if (faction) {
    ctx.font      = '15px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(faction, TX, 120);
  }

  // Souffle / Art Sanguinaire
  if (souffle) {
    ctx.font      = '15px sans-serif';
    ctx.fillStyle = hexToRgba(colors.secondary, 1);
    ctx.fillText(souffle, TX, 145);
  }

  // ── Bloc NIVEAU (droite) ─────────────────────────────────────
  const BLK_W  = 180;
  const BLK_X  = W - BLK_W - 28;
  const BLK_Y  = 20;
  const BLK_H  = 130;

  // Fond du bloc niveau
  drawRoundedRect(ctx, BLK_X, BLK_Y, BLK_W, BLK_H, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  drawRoundedRect(ctx, BLK_X, BLK_Y, BLK_W, BLK_H, 14);
  ctx.strokeStyle = hexToRgba(colors.primary, 0.3);
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Label NIVEAU
  ctx.font      = 'bold 13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'center';
  ctx.fillText('NIVEAU', BLK_X + BLK_W / 2, BLK_Y + 22);

  // Numéro du niveau (gros)
  ctx.font       = 'bold 68px sans-serif';
  ctx.fillStyle  = colors.primary;
  ctx.shadowColor = hexToRgba(colors.glow, 0.9);
  ctx.shadowBlur  = 22;
  ctx.fillText(String(level), BLK_X + BLK_W / 2, BLK_Y + 95);
  ctx.shadowBlur  = 0;

  // ── Bloc CLASSEMENT SERVEUR (droite, sous niveau) ─────────────
  if (serverRank != null) {
    const RNK_Y = BLK_Y + BLK_H + 10;
    drawRoundedRect(ctx, BLK_X, RNK_Y, BLK_W, 46, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    drawRoundedRect(ctx, BLK_X, RNK_Y, BLK_W, 46, 10);
    ctx.strokeStyle = hexToRgba(colors.primary, 0.25);
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.font      = 'bold 12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('CLASSEMENT', BLK_X + BLK_W / 2, RNK_Y + 16);

    ctx.font       = 'bold 22px sans-serif';
    ctx.fillStyle  = '#FFD700';
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur  = 8;
    ctx.fillText(`#${serverRank}`, BLK_X + BLK_W / 2, RNK_Y + 38);
    ctx.shadowBlur  = 0;
  }

  ctx.textAlign = 'left';

  // ── Barre XP ─────────────────────────────────────────────────
  const BAR_X = TX;
  const BAR_Y = 176;
  const BAR_W = BLK_X - TX - 18;
  const BAR_H = 24;
  const BAR_R = 12;

  const progress = Math.min(xpInLevel / xpForLevel, 1);

  // Fond barre
  drawRoundedRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();

  // Remplissage
  if (progress > 0) {
    const fw = Math.max(BAR_R * 2, Math.floor(BAR_W * progress));
    const fill = ctx.createLinearGradient(BAR_X, 0, BAR_X + fw, 0);
    fill.addColorStop(0, colors.secondary);
    fill.addColorStop(1, colors.primary);
    drawRoundedRect(ctx, BAR_X, BAR_Y, fw, BAR_H, BAR_R);
    ctx.fillStyle = fill;
    ctx.fill();
    // Brillance
    drawRoundedRect(ctx, BAR_X, BAR_Y, fw, BAR_H / 2, BAR_R);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
  }

  // Bordure barre
  drawRoundedRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
  ctx.strokeStyle = hexToRgba(colors.primary, 0.45);
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ── % centré sur la barre ─────────────────────────────────────
  ctx.font      = 'bold 13px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur  = 4;
  ctx.fillText(`${percent}%`, BAR_X + BAR_W / 2, BAR_Y + BAR_H - 6);
  ctx.shadowBlur  = 0;
  ctx.textAlign   = 'left';

  // XP à gauche sous la barre
  ctx.font      = 'bold 13px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${xp.toLocaleString('fr-FR')} XP total`, BAR_X, BAR_Y + BAR_H + 20);

  // XP progression à droite sous la barre
  ctx.fillStyle = hexToRgba(colors.primary, 0.9);
  ctx.textAlign = 'right';
  ctx.fillText(`${xpInLevel.toLocaleString('fr-FR')} / ${xpForLevel.toLocaleString('fr-FR')} XP → Niv. ${level + 1}`, BAR_X + BAR_W, BAR_Y + BAR_H + 20);
  ctx.textAlign = 'left';

  // ── Watermark ─────────────────────────────────────────────────
  ctx.font      = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'right';
  ctx.fillText('Castel Univers • Demon Slayer', W - 18, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };
