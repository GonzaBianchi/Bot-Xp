// Comando /sincronizaroles: sincroniza los roles de nivel dinámicamente
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';

// Modelo para guardar roles de nivel en la base de datos
const LevelRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true },
  minLevel: { type: Number, required: true }
});
LevelRoleSchema.index({ guildId: 1, minLevel: 1 }, { unique: true });
export const LevelRole = mongoose.models.LevelRole || mongoose.model('LevelRole', LevelRoleSchema);

export const data = new SlashCommandBuilder()
  .setName('sincronizaroles')
  .setDescription('Sincroniza los roles de nivel del servidor (solo administradores)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  const pattern = /^✦─────『(.+)』─────✦$/u;
  const levelRoles = [];
  const nuevosSinNivel = [];
  // Buscar roles que coincidan con el patrón
  guild.roles.cache.forEach(role => {
    const match = role.name.match(pattern);
    if (match) {
      // Buscar si ya existe en la base de datos
      // Si existe, mantener su minLevel
      // Si no, dejar minLevel en null
      levelRoles.push({
        guildId: guild.id,
        roleId: role.id,
        roleName: role.name,
        minLevel: null
      });
      nuevosSinNivel.push(role.name);
    }
  });
  if (levelRoles.length === 0) {
    return interaction.editReply('No se encontraron roles de nivel con el patrón especificado.');
  }
  // Elimina los anteriores de este guild
  await LevelRole.deleteMany({ guildId: guild.id });
  await LevelRole.insertMany(levelRoles);
  // Mostrar resumen
  let msg = `Roles sincronizados: ${levelRoles.length}.`;
  if (nuevosSinNivel.length > 0) {
    msg += `\nLos siguientes roles no tienen nivel asignado. Usa /setnivelrol para asignarles un nivel:\n- ` + nuevosSinNivel.join('\n- ');
  }
  await interaction.editReply(msg);
}
