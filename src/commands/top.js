// Comando /top: muestra el ranking de usuarios con más XP
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Muestra el ranking de usuarios con más XP en el servidor')
  .addIntegerOption(option =>
    option.setName('pagina')
      .setDescription('Página a mostrar (50 usuarios por página)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const pagina = interaction.options.getInteger('pagina') || 1;
  const guildId = interaction.guild.id;
  const pageSize = 20;
  const skip = (pagina - 1) * pageSize;
  const totalUsers = await User.countDocuments({ guildId });
  const topUsers = await User.find({ guildId })
    .sort({ level: -1, xp: -1 })
    .skip(skip)
    .limit(pageSize);
  if (!topUsers.length) {
    return interaction.reply('No hay usuarios con XP aún en esta página.');
  }
  const description = topUsers.map((u, i) => `**${skip + i + 1}.** <@${u.userId}> - Nivel ${u.level} (${u.xp} XP)`).join('\n');
  const totalPages = Math.ceil(totalUsers / pageSize);
  const embed = new EmbedBuilder()
    .setTitle('Ranking de XP')
    .setDescription(description)
    .setFooter({ text: `Página ${pagina} de ${totalPages}` })
    .setColor(0xFFD700);
  return interaction.reply({ embeds: [embed] });
}
