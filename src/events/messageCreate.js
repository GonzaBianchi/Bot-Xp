// Evento: messageCreate para XP automático por mensajes
import { addXp } from '../utils/xpSystem.js';
import { updateMemberRoles } from '../utils/roleManager.js';
import { XP_PER_MESSAGE, XP_COOLDOWN } from '../config.js';
import User from '../models/User.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { GeminiToken } from '../models/GeminiToken.js';
import { GeminiContextCache } from '../models/GeminiContextCache.js';
dotenv.config();

// Mapa para cooldowns: { 'userId-guildId': timestamp }
const cooldowns = new Map();
const LEVEL_UP_CHANNEL_ID = '1269848036545134654';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY;
const GEMINI_CHANNEL_ID = '752883098059800650';

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
  if (user.level > oldLevel) {
    const mensaje = `<a:love:1375278293921828904> Felicitaciones nakama ${message.author}, has avanzado a una nueva parte del Grand Line y ahora eres un pirata de nivel ${user.level}!<:LuffyWow:1375278276620058696>`;
    const levelUpChannel = message.guild.channels.cache.get(LEVEL_UP_CHANNEL_ID);
    if (levelUpChannel) {
      await levelUpChannel.send({ content: mensaje });
    } else {
      await message.channel.send({ content: mensaje });
    }
  }

  // --- Gemini IA ---
  if (message.channel.id === GEMINI_CHANNEL_ID) {
    const botId = message.client.user.id;
    const isMention = message.mentions.has(botId);
    let isReplyToBot = false;
    if (message.reference) {
      try {
        const refMsg = await message.fetchReference();
        isReplyToBot = refMsg.author?.id === botId;
      } catch {}
    }
    if (isMention || isReplyToBot) {
      // Si el mensaje no tiene texto (solo imagen/gif/adjunto/emote/sticker)
      const onlyMedia =
        (!message.content.trim() && message.attachments.size > 0) ||
        (message.stickers && message.stickers.size > 0) ||
        (/^<a?:\w+:\d+>$/.test(message.content.trim()));
      if (onlyMedia) {
        await message.reply('¿Eh? ¿Qué es eso? ¡No entiendo esa tecnología! Shishishi~');
        return;
      }
      // Prompt personalizado para Gemini
      const prompt = `Responde como Monkey D. Luffy de One Piece. Eres alegre, directo, a veces ingenuo, pero siempre valiente y con espíritu de aventura. Responde de manera coherente, pero manteniendo tu estilo único de Luffy. Si te preguntan algo, contesta como lo haría Luffy, usando expresiones y personalidad propias del personaje. Mensaje del usuario: "${message.content.replace(`<@${botId}>`, '').trim()}"`;
      // --- Context Cache Gemini ---
      let contextCacheDoc = await GeminiContextCache.findOne({ channelId: message.channel.id });
      let contextCacheId = contextCacheDoc?.contextCacheId;
      // --- Token counting Gemini persistente ---
      const TOKEN_LIMIT = 2000000;
      const TOKEN_MARGIN = 5000; // margen de seguridad
      const nowDate = new Date();
      const monthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
      let tokenDoc = await GeminiToken.findOne({ month: monthKey });
      if (!tokenDoc) {
        tokenDoc = await GeminiToken.create({ month: monthKey, used: 0 });
      }
      try {
        // Usar la API de Gemini para contar tokens
        const countRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:countTokens?key=${GEMINI_API_KEY}`,
          contextCacheId
            ? { contents: [{ parts: [{ text: prompt }] }], contextCacheId }
            : { contents: [{ parts: [{ text: prompt }] }] }
        );
        const tokensUsed = countRes.data.totalTokens || 0;
        if (tokenDoc.used + tokensUsed > TOKEN_LIMIT - TOKEN_MARGIN) {
          // No responder si se pasa del límite
          console.log('Límite de tokens de Gemini alcanzado, no se responderá.');
          return;
        }
        // Sumar tokens estimados y guardar en MongoDB
        tokenDoc.used += tokensUsed;
        await tokenDoc.save();
      } catch (err) {
        console.error('Error al contar tokens Gemini:', err);
        // Si falla el conteo, por seguridad no responde
        return;
      }
      try {
        const reqBody = contextCacheId
          ? { contents: [{ parts: [{ text: prompt }] }], contextCacheId }
          : { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(GEMINI_URL, reqBody);
        const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No tengo respuesta.';
        // Guardar/actualizar contextCacheId si viene uno nuevo
        const newContextCacheId = response.data.contextCacheId;
        if (newContextCacheId) {
          if (contextCacheDoc) {
            contextCacheDoc.contextCacheId = newContextCacheId;
            contextCacheDoc.updatedAt = new Date();
            await contextCacheDoc.save();
          } else {
            await GeminiContextCache.create({ channelId: message.channel.id, contextCacheId: newContextCacheId });
          }
        }
        await message.reply(aiReply);
      } catch (error) {
        // Si el contexto expiró, eliminarlo para reiniciar la conversación
        if (error?.response?.data?.error?.message?.includes('context cache not found')) {
          await GeminiContextCache.deleteOne({ channelId: message.channel.id });
          await message.reply('¡Oops! Se perdió el contexto de la conversación. Intenta de nuevo.');
        } else {
          await message.reply('Lo siento, hubo un error al generar la respuesta.');
        }
        console.error(error);
      }
      return; // No ejecutar XP si es respuesta de IA
    }
  }
}
