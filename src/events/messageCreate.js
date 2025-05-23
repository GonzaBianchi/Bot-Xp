// Evento: messageCreate para XP automático por mensajes
import { addXp } from '../utils/xpSystem.js';
import { updateMemberRoles } from '../utils/roleManager.js';
import { XP_PER_MESSAGE, XP_COOLDOWN } from '../config.js';
import User from '../models/User.js';

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
  // Obtener datos anteriores
  const oldUser = await User.findOne({ userId, guildId });
  const oldLevel = oldUser ? oldUser.level : 1;
  // Calcular XP usando el rango de config.js
  const xpGanada = Math.floor(Math.random() * (XP_PER_MESSAGE.max - XP_PER_MESSAGE.min + 1)) + XP_PER_MESSAGE.min;
  const user = await addXp(userId, guildId, xpGanada);
  await updateMemberRoles(message.member, user.level);
  // Establecer cooldown
  cooldowns.set(key, now + XP_COOLDOWN);
  // Mensaje de subida de nivel
  const mensaje = `<a:love:1375278293921828904> Felicitaciones nakama ${message.author}, has avanzado a una nueva parte del Grand Line y ahora eres un pirata de nivel ${user.level}!<:LuffyWow:1375278276620058696>`;
  if (user.level > oldLevel) {
    await message.channel.send({
      content: `${mensaje}`,
    });
  }
}
