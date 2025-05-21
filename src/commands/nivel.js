// Comando /nivel: muestra el nivel y XP actual del usuario
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';
import { calculateLevelXp } from '../utils/xpSystem.js';

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
  // Obtener ranking si la función está disponible
  let rank = null;
  if (typeof getUserRank === 'function') {
    rank = await getUserRank(userId, guildId);
  }
  const embed = new EmbedBuilder()
    .setTitle(`Nivel de ${target.username}`)
    .setDescription(`Nivel: **${user.level}**\nXP: **${user.xp}/${neededXp}**${rank ? `\nRanking: #${rank}` : ''}`)
    .setColor(0x00AE86);
  return interaction.reply({ embeds: [embed] });
}
