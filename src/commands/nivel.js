// Comando /nivel: muestra el nivel y XP actual del usuario
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';
import { calculateLevelXp, getUserRank } from '../utils/xpSystem.js';

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
  // Calcular porcentaje de XP
  const percent = Math.floor((user.xp / neededXp) * 100);
  // Generar barra de experiencia mejorada
  const totalBars = 16;
  const filledBars = Math.round((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  // Usa emojis para la barra: 🟩 (lleno), ⬜ (vacío)
  const bar = `${'🟩'.repeat(filledBars)}${'⬜'.repeat(emptyBars)}`;
  // Mensaje superior personalizado con los nuevos IDs de emoji
  const mensaje = `<a:love:1375278293921828904> Felicitaciones nakama ${target}, has avanzado a una nueva parte del Grand Line y ahora eres un pirata de nivel ${user.level}!<:LuffyWow:1375278276620058696>`;
  const embed = new EmbedBuilder()
    .setTitle(`Nivel de ${target.username}`)
    .setDescription(`${mensaje}\n\nNivel: **${user.level}**\nXP: **${user.xp}/${neededXp}**\n${bar} ${percent}%\nTop: #${rank}`)
    .setColor(0x00AE86)
    .setThumbnail(target.displayAvatarURL({ extension: 'png', size: 256 }));
  return interaction.reply({ embeds: [embed] });
}
