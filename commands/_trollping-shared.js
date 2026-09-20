// _trollping-shared.js
// Shared state and scheduling logic for /trollping-start and /trollping-stop.
// Not a command itself — the loader will require() this file too since it ends
// in .js, but it has no `data`/`execute` at the top level so it's skipped safely.

const OWNER_ID = '1347447934597464089';
const TARGET_CHANNEL_ID = '1468124876618596466';
const TARGET_USER_IDS = [
  '917383981039771670',
  '1337622266493534279',
];

// Random interval range (ms) — avoids a robotic fixed-clock ping
const MIN_INTERVAL_MS = 3 * 60 * 1000;  // 3 min
const MAX_INTERVAL_MS = 10 * 60 * 1000; // 10 min

// Keep track of active troll loops per guild so /trollping-stop can cancel them
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
  OWNER_ID,
  TARGET_CHANNEL_ID,
  TARGET_USER_IDS,
  activeTrolls,
  scheduleNextPing,
};
