// trollping.js
// Slash commands: /trollping-start, /trollping-stop
// Only usable by YOUR_USER_ID (set below)

const { SlashCommandBuilder } = require('discord.js');

const OWNER_ID = '1347447934597464089';
const TARGET_CHANNEL_ID = '1468124876618596466';
const TARGET_USER_IDS = [
  '917383981039771670',
  '1337622266493534279',
];

// Random interval range (ms) — avoids a robotic fixed-clock ping
const MIN_INTERVAL_MS = 3 * 60 * 1000;  // 3 min
const MAX_INTERVAL_MS = 10 * 60 * 1000; // 10 min

// Keep track of active troll loops per guild so /stop can cancel them
const activeTrolls = new Map(); // guildId -> timeoutId

function randomInterval() {
  return Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1)) + MIN_INTERVAL_MS;
}

function scheduleNextPing(client, guildId) {
  const delay = randomInterval();
  const timeoutId = setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        const mentions = TARGET_USER_IDS.map(id => `<@${id}>`).join(' ');
        await channel.send(mentions);
      }
    } catch (err) {
      console.error('Troll ping failed:', err);
    }
    // Reschedule if still active
    if (activeTrolls.has(guildId)) {
      scheduleNextPing(client, guildId);
    }
  }, delay);

  activeTrolls.set(guildId, timeoutId);
}

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName('trollping-start')
      .setDescription('Start the troll ping loop (owner only)'),
    new SlashCommandBuilder()
      .setName('trollping-stop')
      .setDescription('Stop the troll ping loop (owner only)'),
  ],

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "You can't use this command.", ephemeral: true });
    }

    const guildId = interaction.guildId;

    if (interaction.commandName === 'trollping-start') {
      if (activeTrolls.has(guildId)) {
        return interaction.reply({ content: 'Already running.', ephemeral: true });
      }
      scheduleNextPing(interaction.client, guildId);
      return interaction.reply({ content: 'Troll ping loop started.', ephemeral: true });
    }

    if (interaction.commandName === 'trollping-stop') {
      const timeoutId = activeTrolls.get(guildId);
      if (!timeoutId) {
        return interaction.reply({ content: 'Not currently running.', ephemeral: true });
      }
      clearTimeout(timeoutId);
      activeTrolls.delete(guildId);
      return interaction.reply({ content: 'Troll ping loop stopped.', ephemeral: true });
    }
  },
};
