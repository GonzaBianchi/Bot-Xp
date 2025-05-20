// Evento: messageCreate para XP automático por mensajes
import { addXp } from '../utils/xpSystem.js';
import { updateMemberRoles } from '../utils/roleManager.js';
import { XP_PER_MESSAGE, XP_COOLDOWN } from '../config.js';

// Mapa para cooldowns: { 'userId-guildId': timestamp }
const cooldowns = new Map();

export default async function(message) {
  if (message.author.bot || !message.guild) return;
  const userId = message.author.id;
  const guildId = message.guild.id;
  const key = `${userId}-${guildId}`;
  const now = Date.now();
  // Verificar cooldown
  if (cooldowns.has(key) && now < cooldowns.get(key)) return;
  // Calcular XP usando el rango de config.js
  const xpGanada = Math.floor(Math.random() * (XP_PER_MESSAGE.max - XP_PER_MESSAGE.min + 1)) + XP_PER_MESSAGE.min;
  const user = await addXp(userId, guildId, xpGanada);
  await updateMemberRoles(message.member, user.level);
  // Establecer cooldown
  cooldowns.set(key, now + XP_COOLDOWN);
}
