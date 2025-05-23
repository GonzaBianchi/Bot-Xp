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

  // --- Generar la imagen tipo rank card ---
  const width = 800;
  const height = 240;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = '#23272A';
  ctx.fillRect(0, 0, width, height);

  // Avatar
  const avatarURL = target.displayAvatarURL({ extension: 'png', size: 128 });
  const avatar = await loadImage(avatarURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 120, 80, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 40, 40, 160, 160);
  ctx.restore();

  // Nombre y nivel
  ctx.font = 'bold 36px Sans';
  ctx.fillStyle = '#fff';
  ctx.fillText(target.username, 220, 90);
  ctx.font = '28px Sans';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`Nivel: ${user.level}`, 220, 140);
  ctx.fillStyle = '#00BFFF';
  ctx.fillText(`Top: #${rank}`, 220, 180);

  // Barra de experiencia
  const barX = 220;
  const barY = 200;
  const barWidth = 520;
  const barHeight = 32;
  const percent = Math.floor((user.xp / neededXp) * 100);
  // Fondo barra
  ctx.fillStyle = '#444';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  // Barra llena
  ctx.fillStyle = '#43B581';
  ctx.fillRect(barX, barY, Math.floor(barWidth * (percent / 100)), barHeight);
  // Texto XP
  ctx.font = '22px Sans';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${user.xp} / ${neededXp} XP (${percent}%)`, barX + 10, barY + 24);

  // Adjuntar imagen
  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
  return interaction.reply({
    files: [attachment],
    embeds: [{ image: { url: 'attachment://rank.png' } }]
  });
}
