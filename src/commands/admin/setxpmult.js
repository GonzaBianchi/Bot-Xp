// Comando /setxpmult: establece el multiplicador global de XP
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setXpMultiplier, getXpMultiplier } from '../../utils/xpSystem.js';

export const data = new SlashCommandBuilder()
  .setName('setxpmult')
  .setDescription('Establece el multiplicador global de XP (x0.25, x0.5, x0.75, x1, x2, x4, x6)')
  .addIntegerOption(option =>
    option.setName('multiplicador')
      .setDescription('Multiplicador de XP (0.25, 0.5, 0.75, 1, 2, 4, 6)')
      .setRequired(true)
      .addChoices(
        { name: 'x0.25', value: 25 },
        { name: 'x0.5', value: 50 },
        { name: 'x0.75', value: 75 },
        { name: 'x1', value: 100 },
        { name: 'x2', value: 200 },
        { name: 'x4', value: 400 },
        { name: 'x6', value: 600 }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  let mult = interaction.options.getInteger('multiplicador');
  // Convertir a decimal si es necesario
  if ([25, 50, 75, 100, 200, 400, 600].includes(mult)) {
    mult = mult / 100;
  }
  if (!mult) {
    const actual = await getXpMultiplier();
    return interaction.reply({ content: `El multiplicador global de XP actual es x${actual}.`, ephemeral: true });
  }
  await setXpMultiplier(mult);
  return interaction.reply({ content: `El multiplicador global de XP ahora es x${mult}.`, ephemeral: true });
}
