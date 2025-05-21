// utils/roleManager.js
/**
 * Sistema de gestión de roles basados en niveles
 * Los roles se asignan cada 5 niveles y son exclusivos entre sí
 */

import mongoose from 'mongoose';

const LevelRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true },
  minLevel: { type: Number, required: false, default: null }
});
LevelRoleSchema.index({ guildId: 1, minLevel: 1 }, { unique: true, partialFilterExpression: { minLevel: { $type: 'number' } } });
export const LevelRole = mongoose.models.LevelRole || mongoose.model('LevelRole', LevelRoleSchema);

/**
 * Obtiene el rol correspondiente según el nivel del usuario, dinámicamente desde la base de datos
 * Solo considera roles con minLevel asignado (no null)
 * @param {string} guildId - ID del servidor
 * @param {number} level - Nivel del usuario
 * @returns {Promise<Object|null>} Objeto con info del rol o null si no corresponde
 */
export async function getRoleForLevel(guildId, level) {
  // Buscar el rol de mayor minLevel <= level y minLevel != null
  const role = await LevelRole.findOne({ guildId, minLevel: { $ne: null, $lte: level } }).sort({ minLevel: -1 });
  return role;
}

/**
 * Actualiza los roles del usuario según su nivel, usando los roles sincronizados
 * Solo considera roles con minLevel asignado
 * @param {Object} member - Objeto member de Discord.js
 * @param {number} level - Nivel actual del usuario
 * @returns {Promise<Object>} - Resultado de la actualización {success, added, removed}
 */
export async function updateMemberRoles(member, level) {
  try {
    const guildId = member.guild.id;
    // Obtener el rol correspondiente al nivel actual
    const currentLevelRole = await getRoleForLevel(guildId, level);
    // Lista para almacenar los resultados
    const result = {
      success: false,
      added: null,
      removed: []
    };
    // Obtener todos los roles de nivel sincronizados con minLevel asignado
    const allLevelRoles = await LevelRole.find({ guildId, minLevel: { $ne: null } });
    // Si el usuario no tiene nivel suficiente para ningún rol, quitamos todos los roles de nivel
    if (!currentLevelRole) {
      for (const roleConfig of allLevelRoles) {
        const role = member.guild.roles.cache.get(roleConfig.roleId);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          result.removed.push(roleConfig.roleName);
        }
      }
      result.success = true;
      return result;
    }
    // Buscar el rol correspondiente en el servidor
    const roleToAdd = member.guild.roles.cache.get(currentLevelRole.roleId);
    if (!roleToAdd) {
      return {
        success: false,
        error: `El rol "${currentLevelRole.roleName}" no existe en el servidor`
      };
    }
    // Quitar roles de nivel anteriores (si los tiene)
    for (const roleConfig of allLevelRoles) {
      if (roleConfig.roleId === currentLevelRole.roleId) continue;
      const role = member.guild.roles.cache.get(roleConfig.roleId);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        result.removed.push(roleConfig.roleName);
      }
    }
    // Añadir el nuevo rol si no lo tiene
    if (!member.roles.cache.has(roleToAdd.id)) {
      await member.roles.add(roleToAdd);
      result.added = currentLevelRole.roleName;
    }
    result.success = true;
    return result;
  } catch (error) {
    console.error('Error actualizando roles:', error);
    return {
      success: false,
      error: 'Error actualizando roles',
      details: error.message
    };
  }
}