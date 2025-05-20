// index.js
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';

dotenv.config();

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Carga dinámica de eventos ---
const eventsPath = path.resolve('./src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = await import(`./events/${file}`);
  const eventName = file.replace('.js', '');
  if (eventName === 'ready') {
    client.once('ready', (...args) => event.default(...args, client));
  } else {
    client.on(eventName, (...args) => event.default(...args, client));
  }
}

// --- Registro de comandos slash (sin los de roles) ---
import { data as nivel } from './commands/nivel.js';
import { data as top } from './commands/top.js';
import { data as info } from './commands/info.js';
import { data as agregaxp } from './commands/admin/agregaxp.js';
import { data as quitaxp } from './commands/admin/quitaxp.js';
import { data as establecernivel } from './commands/admin/establecernivel.js';

const commands = [nivel, top, info, agregaxp, quitaxp, establecernivel];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  // Registrar los comandos slash
  try {
    console.log('⏳ Registrando comandos slash...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('✅ Comandos slash registrados correctamente');
  } catch (error) {
    console.error('❌ Error registrando comandos slash:', error);
  }
});

client.login(process.env.TOKEN);

// --- Servidor Express para mantener activo el bot ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Bot de Discord activo 🚀');
});
app.listen(PORT, () => {
  console.log(`🌐 Servidor Express escuchando en el puerto ${PORT}`);
});
