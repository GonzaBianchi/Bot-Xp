// Comando /rolesniveles: muestra los roles de nivel y su nivel mínimo
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LevelRole } from '../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('rolesniveles')
  .setDescription('Muestra la lista de roles de nivel y el nivel mínimo requerido');

export async function execute(interaction) {
  try {
    const guildId = interaction.guild.id;
    const roles = await LevelRole.find({ guildId, minLevel: { $ne: null } }).sort({ minLevel: 1 });
    if (!roles.length) {
      await interaction.reply({ content: 'No hay roles de nivel configurados en este servidor.', flags: 64 });
      return;
    }
    const desc = roles.map(r => `**Nivel ${r.minLevel}:** <@&${r.roleId}>`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Roles de Nivel')
      .setDescription(desc)
      .setColor(0x3498DB);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error en /rolesniveles:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Ocurrió un error al ejecutar el comando.', flags: 64 });
    } else {
      await interaction.editReply({ content: 'Ocurrió un error al ejecutar el comando.', flags: 64 });
    }
  }
}
