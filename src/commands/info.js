// Comando /info: muestra información sobre el sistema de niveles
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Muestra información sobre el sistema de niveles');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Sistema de Niveles')
    .setDescription('Gana XP participando en el chat. Sube de nivel y obtén roles exclusivos. ¡Participa para llegar al top!')
    .setColor(0x3498DB);
  return interaction.reply({ embeds: [embed] });
}
