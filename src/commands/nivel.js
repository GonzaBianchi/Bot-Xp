// Comando /nivel: muestra el nivel y XP actual del usuario
import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import User from '../models/User.js';
import { calculateLevelXp, getUserRank } from '../utils/xpSystem.js';
import { createCanvas, loadImage } from 'canvas';

export const data = new SlashCommandBuilder()
  .setName('nivel')
  .setDescription('Muestra tu nivel y XP actual o el de otro usuario')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario del que mostrar el nivel')
      .setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('usuario') || interaction.user;
  const userId = target.id;
  const guildId = interaction.guild.id;
  const user = await User.findOne({ userId, guildId });
  if (!user) {
    return interaction.reply({ content: `${target.id === interaction.user.id ? 'No tienes' : `El usuario ${target}`} no tiene datos de nivel aún.`, ephemeral: true });
  }
  const neededXp = calculateLevelXp(user.level);
  const rank = await getUserRank(userId, guildId);

  // --- Generar la imagen tipo rank card estilo MEE6 ---
  // Fondo general
  const width = 800;
  const height = 240;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, width, height);

  // Card interna (borde redondeado)
  ctx.fillStyle = '#23272A';
  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(width - 20, 20);
  ctx.quadraticCurveTo(width - 10, 20, width - 10, 30);
  ctx.lineTo(width - 10, height - 30);
  ctx.quadraticCurveTo(width - 10, height - 10, width - 30, height - 10);
  ctx.lineTo(30, height - 10);
  ctx.quadraticCurveTo(20, height - 10, 20, height - 30);
  ctx.lineTo(20, 30);
  ctx.quadraticCurveTo(20, 20, 30, 20);
  ctx.closePath();
  ctx.fill();

  // Avatar más grande y estado más pegado
  const avatarSize = 120;
  const avatarX = 60;
  const avatarY = 60;
  const avatarURL = target.displayAvatarURL({ extension: 'png', size: 128 });
  const avatar = await loadImage(avatarURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();
  // Círculo de estado (más pegado al avatar)
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize - 18, avatarY + avatarSize - 18, 16, 0, Math.PI * 2, true);
  ctx.fillStyle = '#FFB319'; // color amarillo (online)
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#23272A';
  ctx.stroke();

  // Nombre de usuario
  ctx.font = '32px Sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(target.username, 200, 110);

  // Rango y nivel
  ctx.font = '20px Sans-serif';
  ctx.fillStyle = '#B0B0B0';
  ctx.fillText('RANGO', 540, 70);
  ctx.font = 'bold 44px Sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`#${rank}`, 540, 115);
  ctx.font = '20px Sans-serif';
  ctx.fillStyle = '#3CB4E7';
  ctx.fillText('NIVEL', 670, 70);
  ctx.font = 'bold 44px Sans-serif';
  ctx.fillStyle = '#3CB4E7';
  ctx.fillText(`${user.level}`, 670, 115);

  // XP texto (solo una vez, sin repetir "XP")
  ctx.font = '22px Sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  function formatXP(xp) {
    return xp >= 1000 ? (xp / 1000).toFixed(2).replace(/\.00$/, '') + 'K' : xp;
  }
  ctx.fillText(`${formatXP(user.xp)} / ${formatXP(neededXp)} XP`, 540, 160);
  ctx.globalAlpha = 0.5;
  ctx.font = '18px Sans-serif';
  ctx.fillStyle = '#fff';

  // Barra de experiencia (redondeada)
  const barX = 200;
  const barY = 180;
  const barWidth = 500;
  const barHeight = 28;
  const percent = Math.floor((user.xp / neededXp) * 100);
  // Fondo barra
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#444B53';
  ctx.beginPath();
  ctx.moveTo(barX, barY + barHeight / 2);
  ctx.arcTo(barX, barY, barX + barWidth, barY, barHeight / 2);
  ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + barHeight, barHeight / 2);
  ctx.arcTo(barX + barWidth, barY + barHeight, barX, barY + barHeight, barHeight / 2);
  ctx.arcTo(barX, barY + barHeight, barX, barY, barHeight / 2);
  ctx.closePath();
  ctx.fill();
  // Barra llena
  ctx.fillStyle = '#3CB4E7';
  ctx.beginPath();
  ctx.moveTo(barX, barY + barHeight / 2);
  ctx.arcTo(barX, barY, barX + barWidth * (percent / 100), barY, barHeight / 2);
  ctx.arcTo(barX + barWidth * (percent / 100), barY, barX + barWidth * (percent / 100), barY + barHeight, barHeight / 2);
  ctx.arcTo(barX + barWidth * (percent / 100), barY + barHeight, barX, barY + barHeight, barHeight / 2);
  ctx.arcTo(barX, barY + barHeight, barX, barY, barHeight / 2);
  ctx.closePath();
  ctx.fill();

  // Adjuntar imagen
  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
  return interaction.reply({
    files: [attachment],
    embeds: [{ image: { url: 'attachment://rank.png' } }]
  });
}
