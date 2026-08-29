// trollping-stop.js
// Slash command: /trollping-stop
// Only usable by OWNER_ID (set below)

const { SlashCommandBuilder } = require('discord.js');
const { OWNER_ID, activeTrolls } = require('./_trollping-shared.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trollping-stop')
    .setDescription('Stop the troll ping loop (owner only)'),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "You can't use this command.", ephemeral: true });
    }
    const guildId = interaction.guildId;
    const timeoutId = activeTrolls.get(guildId);
    if (!timeoutId) {
      return interaction.reply({ content: 'Not currently running.', ephemeral: true });
    }
    clearTimeout(timeoutId);
    activeTrolls.delete(guildId);
    return interaction.reply({ content: 'Troll ping loop stopped.', ephemeral: true });
  },
};
