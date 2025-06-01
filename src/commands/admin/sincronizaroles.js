// Comando /sincronizaroles: sincroniza los roles de nivel dinámicamente
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';

// Modelo para guardar roles de nivel en la base de datos
const LevelRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true },
  minLevel: { type: Number, required: false }
});
LevelRoleSchema.index({ guildId: 1, minLevel: 1 }, { unique: true, partialFilterExpression: { minLevel: { $type: 'number' } } });
export const LevelRole = mongoose.models.LevelRole || mongoose.model('LevelRole', LevelRoleSchema);

export const data = new SlashCommandBuilder()
  .setName('sincronizarolesniveles')
  .setDescription('Sincroniza los roles de nivel del servidor (solo administradores)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const pattern = /^✦─────『(.+)』─────✦$/u;
    const levelRoles = [];
    const nuevosSinNivel = [];
    // Buscar roles que coincidan con el patrón
    for (const role of guild.roles.cache.values()) {
      const match = role.name.match(pattern);
      if (match) {
        // Verifica si ya existe en la base de datos
        const exists = await LevelRole.findOne({ guildId: guild.id, roleId: role.id });
        if (!exists) {
          const roleObj = {
            guildId: guild.id,
            roleId: role.id,
            roleName: role.name
          };
          levelRoles.push(roleObj);
          nuevosSinNivel.push(role.name);
        }
      }
    }
    if (levelRoles.length === 0) {
      await interaction.editReply({ content: 'No se encontraron roles nuevos de nivel para sincronizar. Los roles existentes no se modificaron.', flags: 64 });
      return;
    }
    // Inserta solo los nuevos roles detectados
    for (const role of levelRoles) {
      await LevelRole.create(role);
    }
    // Mostrar resumen
    let msg = `Roles nuevos sincronizados: ${levelRoles.length}.`;
    if (nuevosSinNivel.length > 0) {
      msg += `\nLos siguientes roles no tienen nivel asignado. Usa /setnivelrol para asignarles un nivel:\n- ` + nuevosSinNivel.join('\n- ');
    }
    await interaction.editReply({ content: msg, flags: 64 });
  } catch (error) {
    console.error('Error en /sincronizaroles:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Ocurrió un error al sincronizar los roles. Revisa los logs.', flags: 64 });
    } else {
      await interaction.editReply({ content: 'Ocurrió un error al sincronizar los roles. Revisa los logs.', flags: 64 });
    }
  }
}
