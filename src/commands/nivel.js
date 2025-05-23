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
  try {    // Permitir comandos de usuario solo en canal específico
    const allowedChannelId = '1269848036545134654';
    // Si el usuario NO es admin y el canal no es el permitido, rechazar
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.channel.id !== allowedChannelId) {
      return interaction.reply({ content: 'Solo puedes usar este comando en el canal designado.', flags: 64 });
    }

    const target = interaction.options.getUser('usuario') || interaction.user;
    const userId = target.id;
    const guildId = interaction.guild.id;
    const user = await User.findOne({ userId, guildId });
    if (!user) {
      return interaction.reply({ 
        content: `${target.id === interaction.user.id ? 'No tienes' : `El usuario ${target}`} no tiene datos de nivel aún.`, 
        flags: 64 
      });
    }
    const neededXp = calculateLevelXp(user.level);
    const rank = await getUserRank(userId, guildId);

    // --- Generar la imagen tipo rank card estilo MEE6 ---
    // Configuración del canvas
    const width = 934;  // Más ancho para mejor distribución
    const height = 282; // Más alto para acomodar elementos más grandes
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Cargar y aplicar imagen de fondo con blur
    const backgroundImage = await loadImage('https://media.discordapp.net/attachments/1335116931325497344/1375610821769560075/25d33ab135a483914d9998f0b235973c.jpg');
    
    // Dibujar fondo con blur
    ctx.filter = 'blur(8px)'; // Aplicar blur
    ctx.drawImage(backgroundImage, 0, 0, width, height);
    ctx.filter = 'none';

    // Overlay semitransparente para mejorar legibilidad
    ctx.fillStyle = 'rgba(35, 39, 42, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Card interna con borde redondeado
    ctx.fillStyle = 'rgba(35, 39, 42, 0.5)';
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

    // Avatar más grande
    const avatarSize = 180; // Aumentado de 120
    const avatarX = 40;
    const avatarY = 51;
    const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 }); // Mejor calidad
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
    const statusSize = 30; // Aumentado
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize - 25, avatarY + avatarSize - 25, statusSize, 0, Math.PI * 2, true);
    ctx.fillStyle = statusColor;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#23272A';
    ctx.stroke();

    // Nombre de usuario (más grande)
    ctx.font = '38px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(target.username, 240, 120);

    // Rango y nivel (más grandes)
    ctx.font = 'bold 24px Sans-serif';
    ctx.fillStyle = '#B0B0B0';
    ctx.fillText('RANGO', 580, 80);
    ctx.font = 'bold 52px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`#${rank}`, 580, 130);
    
    ctx.font = 'bold 24px Sans-serif';
    ctx.fillStyle = '#3CB4E7';
    ctx.fillText('NIVEL', 750, 80);
    ctx.font = 'bold 52px Sans-serif';
    ctx.fillStyle = '#3CB4E7';
    ctx.fillText(`${user.level}`, 750, 130);

    // XP texto (más grande)
    ctx.font = '26px Sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    function formatXP(xp) {
      return xp >= 1000 ? (xp / 1000).toFixed(2).replace(/\.00$/, '') + 'K' : xp;
    }
    ctx.fillText(`${formatXP(user.xp)} / ${formatXP(neededXp)} XP`, 580, 180);

    // Barra de experiencia más grande y estilizada
    const barX = 240;
    const barY = 200;
    const barWidth = 650; // Más ancha
    const barHeight = 35;  // Más alta
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

    // Adjuntar imagen
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
    return interaction.reply({
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
    }
  }
}
