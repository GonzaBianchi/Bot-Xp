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

/**
 * Asigna los roles decorativos a un miembro (roles con patrón especial)
 * @param {GuildMember} member - El miembro al que asignar los roles
 */
export async function assignColorRoles(member) {
    try {
        // Patrón que busca cualquier texto entre los decoradores
        const rolePattern = /✧･ﾟ: \*✧･ﾟ:\* 　(.+?)　 \*:･ﾟ✧\*:･ﾟ✧/;
        const guild = member.guild;

        // Verificar si el miembro es un bot y tiene el rol "Bots"
        const isBot = member.user.bot && member.roles.cache.some(role => role.name === 'Bots');
        if (isBot) {
            console.log(`Saltando asignación de roles para bot: ${member.user.tag}`);
            return;
        }
        
        // Obtener todos los roles que coinciden con el patrón
        const decorativeRoles = guild.roles.cache.filter(role => 
            rolePattern.test(role.name)
        );

        if (decorativeRoles.size > 0) {
            // Filtrar roles que el miembro ya tiene para no reasignarlos innecesariamente
            const rolesToAdd = decorativeRoles.filter(role => !member.roles.cache.has(role.id));
            
            if (rolesToAdd.size > 0) {
                await member.roles.add(rolesToAdd.map(role => role.id));
                console.log(`Roles asignados a ${member.user.tag}: ${rolesToAdd.map(r => r.name).join(', ')}`);
                return rolesToAdd.size; // Retornar cantidad de roles agregados
            } else {
                console.log(`${member.user.tag} ya tiene todos los roles decorativos`);
                return 0;
            }
        }
        return 0;
    } catch (error) {
        console.error(`Error asignando roles a ${member.user.tag}:`, error);
        throw error;
    }
}