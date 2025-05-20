// Comando /setxpmult: establece el multiplicador global de XP
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setXpMultiplier, getXpMultiplier } from '../../utils/xpSystem.js';

export const data = new SlashCommandBuilder()
  .setName('setxpmult')
  .setDescription('Establece el multiplicador global de XP (x1, x2, x4, x6)')
  .addIntegerOption(option =>
    option.setName('multiplicador')
      .setDescription('Multiplicador de XP (1, 2, 4, 6)')
      .setRequired(true)
      .addChoices(
        { name: 'x1', value: 1 },
        { name: 'x2', value: 2 },
        { name: 'x4', value: 4 },
        { name: 'x6', value: 6 }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const mult = interaction.options.getInteger('multiplicador');
  if (!mult) {
    const actual = await getXpMultiplier();
    return interaction.reply({ content: `El multiplicador global de XP actual es x${actual}.`, ephemeral: true });
  }
  await setXpMultiplier(mult);
  return interaction.reply({ content: `El multiplicador global de XP ahora es x${mult}.`, ephemeral: true });
}
