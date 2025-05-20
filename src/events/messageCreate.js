// Evento: messageCreate para XP automático por mensajes
import { addXp } from '../utils/xpSystem.js';
import { updateMemberRoles } from '../utils/roleManager.js';

export default async function(message) {
  if (message.author.bot || !message.guild) return;
  // Puedes personalizar la cantidad de XP por mensaje
  const xpGanada = Math.floor(Math.random() * 5) + 1;
  const user = await addXp(message.author.id, message.guild.id, xpGanada);
  await updateMemberRoles(message.member, user.level);
}
