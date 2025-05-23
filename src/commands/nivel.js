// Comando /nivel: muestra el nivel y XP actual del usuario
import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import User from '../models/User.js';
import { calculateLevelXp, getUserRank } from '../utils/xpSystem.js';
import { createCanvas, loadImage } from 'canvas';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('Muestra tu nivel y XP actual o el de otro usuario')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario del que mostrar el nivel')
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    // Diferir la respuesta inmediatamente para evitar el timeout
    await interaction.deferReply();

    // Permitir comandos de usuario solo en canal específico
    const allowedChannelId = '1269848036545134654';
    // Si el usuario NO es admin y el canal no es el permitido, rechazar
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.channel.id !== allowedChannelId) {
      return interaction.editReply({ content: 'Solo puedes usar este comando en el canal designado.', flags: 64 });
    }

    const target = interaction.options.getUser('usuario') || interaction.user;
    const userId = target.id;
    const guildId = interaction.guild.id;
    const user = await User.findOne({ userId, guildId });
    if (!user) {
      return interaction.editReply({ 
        content: `${target.id === interaction.user.id ? 'No tienes' : `El usuario ${target}`} no tiene datos de nivel aún.`, 
        flags: 64 
      });
    }
    const neededXp = calculateLevelXp(user.level);
    const rank = await getUserRank(userId, guildId);

    // --- Generar la imagen tipo rank card estilo MEE6 ---
    // Configuración del canvas
    const width = 1100;  // Aumentado de 934
    const height = 340; // Aumentado de 282
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Cargar y aplicar imagen de fondo con blur
    const backgroundImage = await loadImage('./src/assets/25d33ab135a483914d9998f0b235973c.jpg');
    
    // Dibujar fondo con blur y ajustar tamaño para cubrir todo el canvas
    ctx.filter = 'blur(8px)';
    
    // Calcular dimensiones para mantener la proporción y cubrir todo el canvas
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const x = (width - backgroundImage.width * scale) * 0.5;
    const y = (height - backgroundImage.height * scale) * 0.5;
    
    ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
    ctx.filter = 'none';

    // Overlay semitransparente para mejorar legibilidad
    ctx.fillStyle = 'rgba(35, 39, 42, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Card interna con borde redondeado
    ctx.fillStyle = 'rgba(35, 39, 42, 0.5)';
    ctx.beginPath();
    ctx.moveTo(25, 25);
    ctx.lineTo(width - 25, 25);
    ctx.quadraticCurveTo(width - 15, 25, width - 15, 35);
    ctx.lineTo(width - 15, height - 35);
    ctx.quadraticCurveTo(width - 15, height - 15, width - 35, height - 15);
    ctx.lineTo(35, height - 15);
    ctx.quadraticCurveTo(25, height - 15, 25, height - 35);
    ctx.lineTo(25, 35);
    ctx.quadraticCurveTo(25, 25, 35, 25);
    ctx.closePath();
    ctx.fill();

    // Avatar más grande
    const avatarSize = 220; // Aumentado de 180
    const avatarX = 45;
    const avatarY = 60;
    const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    // Buscar el GuildMember para obtener la presencia real
    let member = null;
    try {
      member = await interaction.guild.members.fetch(userId);
    } catch (e) {
      // Puede fallar si el usuario no está en el servidor
    }
    let statusColor;
    const presence = member?.presence?.status || 'offline';
    switch (presence) {
      case 'online':
        statusColor = '#43B581';
        break;
      case 'idle':
        statusColor = '#FAA61A';
        break;
      case 'dnd':
        statusColor = '#F04747';
        break;
      default:
        statusColor = '#747F8D';
    }

    // Círculo de estado (más grande)
    const statusSize = 38; // Aumentado de 30
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize - 30, avatarY + avatarSize - 30, statusSize, 0, Math.PI * 2, true);
    ctx.fillStyle = statusColor;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#23272A';
    ctx.stroke();

    // Nombre de usuario (más grande y más abajo)
    ctx.font = '42px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(target.username, 290, 240); // Movido más abajo

    // Rango y nivel (más grandes)
    ctx.font = 'bold 28px Sans-serif';
    ctx.fillStyle = '#B0B0B0';
    ctx.fillText('RANGO', 680, 90);
    ctx.font = 'bold 60px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`#${rank}`, 680, 150);
    
    ctx.font = 'bold 28px Sans-serif';
    ctx.fillStyle = '#3CB4E7';
    ctx.fillText('NIVEL', 880, 90);
    ctx.font = 'bold 60px Sans-serif';
    ctx.fillStyle = '#3CB4E7';
    ctx.fillText(`${user.level}`, 880, 150);

    // Barra de experiencia más grande y estilizada
    const barX = 290;
    const barY = 260;
    const barWidth = 760; // Más ancha
    const barHeight = 40;  // Más alta
    const percent = Math.floor((user.xp / neededXp) * 100);
    
    // Fondo barra
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(68, 75, 83, 0.5)';
    ctx.beginPath();
    ctx.moveTo(barX, barY + barHeight / 2);
    ctx.arcTo(barX, barY, barX + barWidth, barY, barHeight / 2);
    ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + barHeight, barHeight / 2);
    ctx.arcTo(barX + barWidth, barY + barHeight, barX, barY + barHeight, barHeight / 2);
    ctx.arcTo(barX, barY + barHeight, barX, barY, barHeight / 2);
    ctx.closePath();
    ctx.fill();
    
    // Barra de progreso con gradiente
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, '#3CB4E7');    // Azul
    gradient.addColorStop(1, '#73E6FF');    // Celeste
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(barX, barY + barHeight / 2);
    ctx.arcTo(barX, barY, barX + barWidth * (percent / 100), barY, barHeight / 2);
    ctx.arcTo(barX + barWidth * (percent / 100), barY, barX + barWidth * (percent / 100), barY + barHeight, barHeight / 2);
    ctx.arcTo(barX + barWidth * (percent / 100), barY + barHeight, barX, barY + barHeight, barHeight / 2);
    ctx.arcTo(barX, barY + barHeight, barX, barY, barHeight / 2);
    ctx.closePath();
    ctx.fill();

    // XP texto (más grande y a la derecha)
    ctx.font = '28px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right'; // Alineado a la derecha
    function formatXP(xp) {
      return xp >= 1000 ? (xp / 1000).toFixed(2).replace(/\.00$/, '') + 'K' : xp;
    }
    ctx.fillText(`${formatXP(user.xp)} / ${formatXP(neededXp)} XP`, barX + barWidth - 10, barY - 10);

    // Adjuntar imagen
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
    return interaction.editReply({
      files: [attachment],
      embeds: [{ image: { url: 'attachment://rank.png' } }]
    });
  } catch (error) {
    console.error('Error en comando rank:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'Ocurrió un error al mostrar el nivel.', 
        flags: 64 
      });
    } else {
      await interaction.editReply({ 
        content: 'Ocurrió un error al mostrar el nivel.', 
        flags: 64 
      });
    }
  }
}
