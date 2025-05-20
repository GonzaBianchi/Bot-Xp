// Comando /nivel: muestra el nivel y XP actual del usuario
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';
import { calculateLevelXp } from '../utils/xpSystem.js';

export const data = new SlashCommandBuilder()
  .setName('nivel')
  .setDescription('Muestra tu nivel y XP actual');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await User.findOne({ userId, guildId });
  if (!user) {
    return interaction.reply({ content: 'No tienes datos de nivel aún.', ephemeral: true });
  }
  const neededXp = calculateLevelXp(user.level);
  const embed = new EmbedBuilder()
    .setTitle(`Nivel de ${interaction.user.username}`)
    .setDescription(`Nivel: **${user.level}**\nXP: **${user.xp}/${neededXp}**`)
    .setColor(0x00AE86);
  return interaction.reply({ embeds: [embed] });
}
