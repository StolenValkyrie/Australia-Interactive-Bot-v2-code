// ============================================================
//  TICKET DATABASE VIEWER
//  The screens behind the /tickets command:
//    list (10 per page)  ->  ticket details  ->  transcript file
// ============================================================

const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} = require('discord.js');

const db = require('./database');
const config = require('./config');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const PAGE_SIZE = 10;

const text = (c) => new TextDisplayBuilder().setContent(c);
const divider = () => new SeparatorBuilder().setDivider(true).setSpacing(1);
const image = (url) =>
  new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));

function newContainer() {
  const c = new ContainerBuilder();
  if (config.accentColor !== null && config.accentColor !== undefined) {
    c.setAccentColor(config.accentColor);
  }
  return c;
}

const ts = (ms, style = 'f') => `<t:${Math.floor(ms / 1000)}:${style}>`;

// Filter is stored in button IDs as: all | u<userId> | q<lookup text>
function encodeFilter({ userId, query } = {}) {
  if (userId) return `u${userId}`;
  if (query) return `q${query.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30)}`;
  return 'all';
}

function decodeFilter(f) {
  if (f && f[0] === 'u') return { userId: f.slice(1) };
  if (f && f[0] === 'q') return { query: f.slice(1) };
  return {};
}

// ---------- screen 1: the list ----------

function buildListView(page, f) {
  const rows = db.listTickets(decodeFilter(f));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(Number(page) || 0, 0), pages - 1);
  const slice = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const c = newContainer().addTextDisplayComponents(text('## Ticket Database'));

  if (!rows.length) {
    c.addTextDisplayComponents(text('No tickets found.'));
  } else {
    const start = current * PAGE_SIZE + 1;
    c.addTextDisplayComponents(
      text(`Showing ${start}-${start + slice.length - 1} of ${rows.length} (newest first) · 📄 = transcript saved`),
      text(
        slice
          .map(
            (r) =>
              `**${r.lookup}** · ${r.typeName} · <@${r.openerId}> · ${ts(r.closedAt, 'd')} · ${r.hasTranscript ? '📄' : '—'}`
          )
          .join('\n')
      )
    );

    c.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`ticket:db:pick:${current}:${f}`)
          .setPlaceholder('Select a ticket to view')
          .addOptions(
            slice.map((r) => ({
              label: `${r.lookup} • ${r.typeName}`.slice(0, 100),
              description: `Opener: ${r.openerName} • ${r.hasTranscript ? 'Transcript saved' : 'No transcript'}`.slice(0, 100),
              value: r.channelId,
            }))
          )
      )
    );

    c.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:db:page:${current - 1}:${f}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(current === 0),
        new ButtonBuilder()
          .setCustomId('ticket:db:noop')
          .setLabel(`Page ${current + 1}/${pages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`ticket:db:page:${current + 1}:${f}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(current >= pages - 1)
      )
    );
  }

  return c.addSeparatorComponents(divider()).addMediaGalleryComponents(image(config.images.footer));
}

// ---------- screen 2: one ticket ----------

function buildDetailView(r, page, f) {
  const lines = [
    `Ticket ID: ${r.ticketId}`,
    `Lookup ID: ${r.lookup}`,
    `Ticket Type: ${r.typeName}`,
    `Opener: <@${r.openerId}> (${r.openerName})`,
    `Closed By: <@${r.closerId}> (${r.closerName})`,
    `Opened: ${ts(r.openedAt)}`,
    `Closed: ${ts(r.closedAt)}`,
    `Reason: ${r.reason}`,
    `Messages: ${r.messageCount}`,
    `Transcript: ${r.hasTranscript ? 'Saved' : 'None'}`,
  ];

  return newContainer()
    .addTextDisplayComponents(text(`## Ticket ${r.lookup}`), text(lines.join('\n')))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:db:tx:${r.channelId}`)
          .setLabel('Transcript')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket:db:back:${page}:${f}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addSeparatorComponents(divider())
    .addMediaGalleryComponents(image(config.images.footer));
}

// ---------- entry points ----------

// Used by the /tickets command
function openDatabase(filter) {
  return buildListView(0, encodeFilter(filter));
}

// Used by handler.js for every button / menu whose ID starts with ticket:db:
// parts = what comes after "ticket:db" in the ID, e.g. ['page', '2', 'all']
async function handleDbInteraction(interaction, parts) {
  const [sub, a, b] = parts;

  if (sub === 'noop') return interaction.deferUpdate();

  if (sub === 'page' || sub === 'back') {
    return interaction.update({ components: [buildListView(a, b)], flags: V2 });
  }

  if (sub === 'pick') {
    const record = db.getTicket(interaction.values[0]);
    if (!record) {
      return interaction.reply({ content: 'That ticket is no longer in the database.', flags: EPHEMERAL });
    }
    return interaction.update({ components: [buildDetailView(record, a, b)], flags: V2 });
  }

  if (sub === 'tx') {
    const record = db.getTicket(a);
    const file = db.transcriptPath(a);

    if (!record || !file) {
      return interaction.reply({ content: 'No transcript available for this ticket.', flags: EPHEMERAL });
    }

    const safeName = String(record.lookup).replace(/[^a-zA-Z0-9]/g, '') || record.channelId;
    return interaction.reply({
      content: `Transcript for **${record.lookup}**:`,
      files: [new AttachmentBuilder(file, { name: `transcript-${safeName}.txt` })],
      flags: EPHEMERAL,
    });
  }
}

module.exports = { openDatabase, handleDbInteraction };