// trollping-start.js
// Slash command: /trollping-start
// Only usable by OWNER_ID (set below)

const { SlashCommandBuilder } = require('discord.js');
const { OWNER_ID, activeTrolls, scheduleNextPing } = require('./_trollping-shared.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trollping-start')
    .setDescription('Start the troll ping loop (owner only)'),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "You can't use this command.", ephemeral: true });
    }
    const guildId = interaction.guildId;
    if (activeTrolls.has(guildId)) {
      return interaction.reply({ content: 'Already running.', ephemeral: true });
    }
    scheduleNextPing(interaction.client, guildId);
    return interaction.reply({ content: 'Troll ping loop started.', ephemeral: true });
  },
};
