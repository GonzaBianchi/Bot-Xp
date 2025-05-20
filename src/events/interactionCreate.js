// Evento: interactionCreate para manejar slash commands
import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Carga dinámica de comandos
const commands = new Collection();
const commandsPath = path.resolve('./src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
// Cargar comandos de usuario
for (const file of commandFiles) {
  const command = await import(`../commands/${file}`);
  commands.set(command.data.name, command);
}
// Cargar comandos de admin
const adminCommandsPath = path.resolve('./src/commands/admin');
if (fs.existsSync(adminCommandsPath)) {
  const adminCommandFiles = fs.readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));
  for (const file of adminCommandFiles) {
    const command = await import(`../commands/admin/${file}`);
    commands.set(command.data.name, command);
  }
}

export default async function(interaction) {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Ocurrió un error al ejecutar el comando.', ephemeral: true });
  }
}
