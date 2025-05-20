// Comando /top: muestra el ranking de usuarios con más XP
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Muestra el ranking de usuarios con más XP en el servidor')
  .addIntegerOption(option =>
    option.setName('cantidad')
      .setDescription('Número de usuarios a mostrar (máximo 10)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const cantidad = interaction.options.getInteger('cantidad') || 5;
  const guildId = interaction.guild.id;
  const topUsers = await User.find({ guildId })
    .sort({ level: -1, xp: -1 })
    .limit(Math.min(cantidad, 10));
  if (!topUsers.length) {
    return interaction.reply('No hay usuarios con XP aún.');
  }
  const description = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - Nivel ${u.level} (${u.xp} XP)`).join('\n');
  const embed = new EmbedBuilder()
    .setTitle('Ranking de XP')
    .setDescription(description)
    .setColor(0xFFD700);
  return interaction.reply({ embeds: [embed] });
}
