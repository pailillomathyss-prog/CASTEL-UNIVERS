const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Couleurs par souffle
const SOUFFLE_COLORS = {
  '🌊 Souffle de l\'Eau':      { primary: '#1E90FF', secondary: '#00BFFF', glow: '#87CEEB' },
  '🔥 Souffle de la Flamme':   { primary: '#FF4500', secondary: '#FF6347', glow: '#FFD700' },
  '⚡ Souffle de la Foudre':   { primary: '#FFD700', secondary: '#FFA500', glow: '#FFFACD' },
  '🌪️ Souffle du Vent':        { primary: '#98FB98', secondary: '#90EE90', glow: '#F0FFF0' },
  '🌫️ Souffle de la Brume':   { primary: '#B0C4DE', secondary: '#778899', glow: '#F0F8FF' },
  '🌸 Souffle de l\'Amour':    { primary: '#FF69B4', secondary: '#FFB6C1', glow: '#FFF0F5' },
  '🦋 Souffle de l\'Insecte':  { primary: '#9370DB', secondary: '#8A2BE2', glow: '#E6E6FA' },
  '🐍 Souffle du Serpent':     { primary: '#2E8B57', secondary: '#3CB371', glow: '#90EE90' },
  '🪨 Souffle de la Roche':    { primary: '#8B7355', secondary: '#A0522D', glow: '#DEB887' },
  '☀️ Souffle du Soleil':      { primary: '#FF8C00', secondary: '#FF6347', glow: '#FFD700' },
  default:                      { primary: '#4169E1', secondary: '#6495ED', glow: '#ADD8E6' },
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
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
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

async function generateRankCard({ username, avatarUrl, level, xp, nextLevelXP, xpInLevel, xpForLevel, rank, faction, souffle }) {
  const W = 900, H = 280;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const colors = getColor(souffle, faction);

  // ── Fond ─────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0a1a');
  bg.addColorStop(0.5, '#12121f');
  bg.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Motif japonais (lignes subtiles)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 30) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let i = 0; i < H; i += 30) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
  }

  // Lueur de fond
  const glow = ctx.createRadialGradient(W * 0.7, H * 0.5, 10, W * 0.7, H * 0.5, 300);
  glow.addColorStop(0, hexToRgba(colors.glow, 0.15));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Bordure principale
  drawRoundedRect(ctx, 2, 2, W - 4, H - 4, 16);
  ctx.strokeStyle = hexToRgba(colors.primary, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ligne colorée à gauche
  const leftBar = ctx.createLinearGradient(0, 0, 0, H);
  leftBar.addColorStop(0, colors.primary);
  leftBar.addColorStop(1, colors.secondary);
  ctx.fillStyle = leftBar;
  drawRoundedRect(ctx, 2, 2, 6, H - 4, 4);
  ctx.fill();

  // ── Avatar ───────────────────────────────────────────────────
  const AVATAR_SIZE = 120;
  const AVATAR_X    = 40;
  const AVATAR_Y    = H / 2 - AVATAR_SIZE / 2;

  // Cercle de lueur derrière l'avatar
  const avatarGlow = ctx.createRadialGradient(
    AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 10,
    AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 80
  );
  avatarGlow.addColorStop(0, hexToRgba(colors.primary, 0.4));
  avatarGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = avatarGlow;
  ctx.beginPath();
  ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, 80, 0, Math.PI * 2);
  ctx.fill();

  // Cercle coloré (border)
  ctx.save();
  ctx.beginPath();
  ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(colors.primary, 0.8);
  ctx.fill();
  ctx.restore();

  // Image de l'avatar
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  } catch {
    // Avatar de substitution si l'image échoue
    ctx.fillStyle = hexToRgba(colors.primary, 0.5);
    ctx.beginPath();
    ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Textes ───────────────────────────────────────────────────
  const TEXT_X = AVATAR_X + AVATAR_SIZE + 30;

  // Nom du membre
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = hexToRgba(colors.primary, 0.8);
  ctx.shadowBlur  = 10;
  ctx.fillText(username, TEXT_X, 70);
  ctx.shadowBlur  = 0;

  // Rang actuel
  ctx.font = '18px sans-serif';
  ctx.fillStyle = hexToRgba(colors.primary, 1);
  ctx.fillText(rank, TEXT_X, 100);

  // Faction
  if (faction) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(faction, TEXT_X, 125);
  }

  // Souffle
  if (souffle) {
    ctx.font = '16px sans-serif';
    ctx.fillStyle = hexToRgba(colors.secondary, 1);
    ctx.fillText(souffle, TEXT_X, 150);
  }

  // ── Niveau ───────────────────────────────────────────────────
  const LEVEL_X = W - 160;

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('NIVEAU', LEVEL_X, 55);

  ctx.font = 'bold 72px sans-serif';
  ctx.fillStyle = colors.primary;
  ctx.shadowColor = hexToRgba(colors.glow, 0.8);
  ctx.shadowBlur  = 20;
  ctx.fillText(String(level), LEVEL_X, 130);
  ctx.shadowBlur  = 0;
  ctx.textAlign   = 'left';

  // ── Barre XP ─────────────────────────────────────────────────
  const BAR_X = TEXT_X;
  const BAR_Y = 175;
  const BAR_W = W - TEXT_X - 50;
  const BAR_H = 22;
  const BAR_R = 11;

  const progress = Math.min(xpInLevel / xpForLevel, 1);

  // Fond de la barre
  drawRoundedRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();

  // Remplissage de la barre
  if (progress > 0) {
    const filledW = Math.max(BAR_R * 2, Math.floor(BAR_W * progress));
    const barFill = ctx.createLinearGradient(BAR_X, 0, BAR_X + filledW, 0);
    barFill.addColorStop(0, colors.secondary);
    barFill.addColorStop(1, colors.primary);
    drawRoundedRect(ctx, BAR_X, BAR_Y, filledW, BAR_H, BAR_R);
    ctx.fillStyle = barFill;
    ctx.fill();

    // Brillance
    drawRoundedRect(ctx, BAR_X, BAR_Y, filledW, BAR_H / 2, BAR_R);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  // Bordure de la barre
  drawRoundedRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
  ctx.strokeStyle = hexToRgba(colors.primary, 0.5);
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Texte XP
  ctx.font      = 'bold 14px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${xp.toLocaleString()} XP`, BAR_X, BAR_Y + BAR_H + 20);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(`${xpInLevel.toLocaleString()} / ${xpForLevel.toLocaleString()} XP`, BAR_X + BAR_W, BAR_Y + BAR_H + 20);
  ctx.textAlign = 'left';

  // Footer watermark
  ctx.font      = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.textAlign = 'right';
  ctx.fillText('Castel Univers • Demon Slayer', W - 20, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };
