// Comando /setnivelrol: asigna manualmente el nivel a un rol de nivel
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelRole } from '../../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('setnivelrol')
  .setDescription('Asigna el nivel mínimo a un rol de nivel (solo administradores)')
  .addRoleOption(option =>
    option.setName('rol')
      .setDescription('Rol de nivel a configurar')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('nivel')
      .setDescription('Nivel mínimo para este rol')
      .setRequired(true)
      .setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const role = interaction.options.getRole('rol');
  const minLevel = interaction.options.getInteger('nivel');
  const guildId = interaction.guild.id;

  // Prevenir duplicados de nivel
  const existing = await LevelRole.findOne({ guildId, minLevel });
  if (existing && existing.roleId !== role.id) {
    return interaction.reply({ content: `Ya existe un rol asignado al nivel ${minLevel}: <@&${existing.roleId}>. Elimina o cambia ese rol primero.`, ephemeral: true });
  }

  // Crear o actualizar la relación
  await LevelRole.findOneAndUpdate(
    { guildId, roleId: role.id },
    { roleName: role.name, minLevel },
    { upsert: true, new: true }
  );
  return interaction.reply({ content: `El rol <@&${role.id}> ahora está asignado al nivel ${minLevel}.`, ephemeral: true });
}
