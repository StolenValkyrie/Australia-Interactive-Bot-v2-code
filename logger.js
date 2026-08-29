// logger.js
// Full chat logger: logs every message sent, plus edits and deletes,
// to a fixed log channel — so deleted/edited content isn't lost.
//
// Usage in index.js (after `const client = new Client({...})`):
//   require('./logger.js')(client);
//
// Configure via .env:
//   LOG_CHANNEL_ID=channel_id_to_send_logs_to

const { EmbedBuilder, Events } = require('discord.js');

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

function truncate(text, max = 1024) {
  if (!text) return text;
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

module.exports = function registerLogger(client) {
  if (!LOG_CHANNEL_ID) {
    console.warn('logger: LOG_CHANNEL_ID not set in .env — chat logging disabled.');
    return;
  }

  async function getLogChannel() {
    return client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  }

  // =========================
  // MESSAGE SENT
  // =========================
  client.on(Events.MessageCreate, async message => {
    if (message.author?.bot) return;
    if (!message.guild) return;
    if (message.channelId === LOG_CHANNEL_ID) return; // don't log the log channel itself

    const logChannel = await getLogChannel();
    if (!logChannel) return;

    const attachments = [...message.attachments.values()].map(a => a.url);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setDescription(truncate(message.content) || '*(no text content)*')
      .addFields({ name: 'Channel', value: `<#${message.channelId}>`, inline: true })
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    if (attachments.length) {
      embed.addFields({ name: 'Attachments', value: attachments.join('\n') });
    }

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // =========================
  // MESSAGE EDITED
  // =========================
  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    try {
      if (newMessage.partial) newMessage = await newMessage.fetch();
    } catch {
      return;
    }
    if (newMessage.author?.bot) return;
    if (!newMessage.guild) return;
    if (newMessage.channelId === LOG_CHANNEL_ID) return;

    const oldContent = oldMessage?.partial ? null : oldMessage?.content;
    const newContent = newMessage.content;

    // Skip "edits" where the visible text didn't actually change
    // (e.g. Discord silently updating a message when a link embed loads)
    if (oldContent === newContent) return;

    const logChannel = await getLogChannel();
    if (!logChannel) return;

    const attachments = [...newMessage.attachments.values()].map(a => a.url);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
      .addFields(
        { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
        { name: 'Before', value: truncate(oldContent) || '*(not cached / unavailable)*' },
        { name: 'After', value: truncate(newContent) || '*(no text content)*' }
      )
      .setFooter({ text: `Message ID: ${newMessage.id}` })
      .setTimestamp();

    if (attachments.length) {
      embed.addFields({ name: 'Attachments', value: attachments.join('\n') });
    }

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  // =========================
  // MESSAGE DELETED
  // =========================
  client.on(Events.MessageDelete, async message => {
    if (!message.guild) return;
    if (message.channelId === LOG_CHANNEL_ID) return;
    if (message.author?.bot) return;

    const logChannel = await getLogChannel();
    if (!logChannel) return;

    // If the message wasn't already cached (e.g. sent before the bot last
    // restarted), Discord doesn't give us its content on delete.
    const content = message.partial ? null : message.content;
    const attachments = message.partial ? [] : [...message.attachments.values()].map(a => a.url);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({
        name: message.author ? message.author.tag : 'Unknown user',
        iconURL: message.author ? message.author.displayAvatarURL() : undefined,
      })
      .addFields({ name: 'Channel', value: `<#${message.channelId}>`, inline: true })
      .setDescription(
        truncate(content) || '*(content unavailable — message was not cached by the bot)*'
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    if (attachments.length) {
      embed.addFields({ name: 'Attachments', value: attachments.join('\n') });
    }

    logChannel.send({ embeds: [embed] }).catch(() => {});
  });

  console.log('✅ Chat logger enabled.');
};
