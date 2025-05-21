// Comando /rolesniveles: muestra los roles de nivel y su nivel mínimo
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LevelRole } from '../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('rolesniveles')
  .setDescription('Muestra la lista de roles de nivel y el nivel mínimo requerido');

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const roles = await LevelRole.find({ guildId, minLevel: { $ne: null } }).sort({ minLevel: 1 });
  if (!roles.length) {
    return interaction.reply({ content: 'No hay roles de nivel configurados en este servidor.', ephemeral: true });
  }
  const desc = roles.map(r => `**Nivel ${r.minLevel}:** <@&${r.roleId}>`).join('\n');
  const embed = new EmbedBuilder()
    .setTitle('Roles de Nivel')
    .setDescription(desc)
    .setColor(0x3498DB);
  return interaction.reply({ embeds: [embed] });
}
