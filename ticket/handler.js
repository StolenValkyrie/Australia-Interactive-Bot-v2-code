// ============================================================
//  TICKET HANDLER
//  Needs discord.js 14.26 or newer (for checkboxes in modals).
//  You shouldn't need to edit this file, use config.js instead.
// ============================================================

const fs = require('fs');
const path = require('path');

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  CheckboxGroupBuilder,
  ContainerBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const config = require('./config');
const db = require('./database');
const { handleDbInteraction } = require('./dbview');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const GAP = '\u2003\u2003'; // wide space used between the two columns in the close log
const NO_PINGS = { parse: [] };

// Claims are saved in data/claims.json (same file/format your old ticket system used),
// so they survive restarts and never touch the channel name/topic rate limit.
const claimsFile = path.join(__dirname, '..', 'data', 'claims.json');

function loadClaims() {
  try {
    return JSON.parse(fs.readFileSync(claimsFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveClaims(claims) {
  try {
    fs.mkdirSync(path.dirname(claimsFile), { recursive: true });
    fs.writeFileSync(claimsFile, JSON.stringify(claims, null, 4));
  } catch (err) {
    console.error('tickets: could not write claims.json:', err);
  }
}

// ---------- small helpers ----------

const fmt = (tpl, vars = {}) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

const text = (content) => new TextDisplayBuilder().setContent(content);
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

const rand = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
const letters = (n) =>
  Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

const first = (v) => (Array.isArray(v) ? v[0] : v);

// Roles that can see a ticket of this type (per-type override, else the global list)
function staffRolesFor(typeKey) {
  return (config.types[typeKey]?.staffRoleIds || config.staffRoleIds).filter(Boolean);
}

// Can use Claim / Unclaim / Close / Rename: global staff, this type's roles, or admins
function isStaff(member, typeKey) {
  const roles = [...config.staffRoleIds, ...staffRolesFor(typeKey)].filter(Boolean);
  return (
    roles.some((id) => member.roles.cache.has(id)) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

// Ticket info is stored in the channel topic, in the same style as your old tickets:
// ticket-owner:123;ticket-type:general;ticket-id:83349;ticket-lookup:GEN301AI
function buildTopic(d) {
  return `ticket-owner:${d.opener};ticket-type:${d.type};ticket-id:${d.id};ticket-lookup:${d.lookup}`;
}

function parseTopic(topic) {
  if (!topic || !topic.includes('ticket-owner:')) return null;
  const out = {};
  for (const part of topic.split(';')) {
    const i = part.indexOf(':');
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return {
    opener: out['ticket-owner'],
    type: out['ticket-type'],
    id: out['ticket-id'] ?? 'N/A',
    lookup: out['ticket-lookup'] ?? 'N/A',
  };
}

// ---------- support panel ----------

function buildPanel() {
  const row = new ActionRowBuilder().addComponents(
    Object.entries(config.types).map(([key, t]) =>
      new ButtonBuilder()
        .setCustomId(`ticket:open:${key}`)
        .setLabel(t.label)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return newContainer()
    .addMediaGalleryComponents(image(config.images.banner))
    .addSeparatorComponents(divider())
    .addTextDisplayComponents(text(config.panel.title), text(config.panel.description))
    .addActionRowComponents(row)
    .addSeparatorComponents(divider())
    .addMediaGalleryComponents(image(config.images.footer));
}

// ---------- modals ----------

function buildTicketModal(typeKey) {
  const t = config.types[typeKey];
  const m = config.modal;

  const reason = new LabelBuilder()
    .setLabel(m.reasonLabel)
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('reason')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    );

  const extra = new LabelBuilder()
    .setLabel(m.additionalLabel)
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('additional')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)
    );

  const staff = new LabelBuilder()
    .setLabel(m.staffLabel)
    .setDescription(m.staffDescription)
    .setStringSelectMenuComponent(
      new StringSelectMenuBuilder()
        .setCustomId('staff')
        .addOptions(
          config.staffOptions.slice(0, 25).map((o, i) => ({
            label: o.label,
            value: o.value,
            default: i === 0,
          }))
        )
    );

  const tos = new LabelBuilder()
    .setLabel(m.tosLabel)
    .setCheckboxGroupComponent(
      new CheckboxGroupBuilder()
        .setCustomId('tos')
        .setRequired(true)
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ])
    );

  return new ModalBuilder()
    .setCustomId(`ticket:submit:${typeKey}`)
    .setTitle(t.label)
    .addLabelComponents(reason, extra, staff, tos);
}

function buildRenameModal() {
  return new ModalBuilder()
    .setCustomId('ticket:renamesubmit')
    .setTitle(config.modal.renameTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(config.modal.renameLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(90)
        )
    );
}

// ---------- ticket card (inside the ticket channel) ----------

function buildTicketCard(t, d) {
  const btn = (id, label) =>
    new ButtonBuilder().setCustomId(`ticket:${id}`).setLabel(label).setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(
    btn('claim', 'Claim'),
    btn('unclaim', 'Unclaim'),
    btn('close', 'Close'),
    btn('rename', 'Rename')
  );

  const details = [
    `${config.modal.reasonLabel}: ${d.reason}`,
    `${config.modal.additionalLabel}: ${d.extra}`,
    `Specific Staff Member: ${d.staffText}`,
    `TOS Agreement: ${d.tos}`,
  ].join('\n');

  const card = newContainer()
    .addMediaGalleryComponents(image(config.images.banner))
    .addSeparatorComponents(divider())
    .addTextDisplayComponents(
      text(t.ticketTitle),
      text(`> Ticket created by <@${d.openerId}>.`),
      text(details)
    );

  // Hidden pings: wrapped in a spoiler so they show as the dark bar above the buttons
  if (d.pings) card.addTextDisplayComponents(text(`||${d.pings}||`));

  return card
    .addActionRowComponents(row)
    .addSeparatorComponents(divider())
    .addMediaGalleryComponents(image(config.images.footer));
}

// ---------- close log ----------
// Posts the "Ticket Closed" card in the log channel. Used by the Close button and by -close.
// reason: text, or empty/null -> "N/A"

async function logTicketClosed(client, channel, closerId, reason) {
  const info = parseTopic(channel.topic);
  if (!info) return;

  const typeName = config.types[info.type]?.typeName ?? info.type;

  // Save the ticket + transcript to the database (must happen before the channel is deleted)
  try {
    await db.saveClosedTicket({ client, channel, info, typeName, closerId, reason });
  } catch (err) {
    console.error('tickets: could not save ticket to the database:', err.message);
  }

  const cleanReason = (reason || '').toString().trim().slice(0, 500) || 'N/A';

  const log = newContainer()
    .addTextDisplayComponents(
      text(config.log.title),
      text(`Ticket ID: ${info.id}${GAP}Opener: <@${info.opener}>`),
      text(`Ticket Type: ${typeName}${GAP}Lookup ID: ${info.lookup}`),
      text(`Closed By: <@${closerId}>${GAP}Database: ${config.log.database}`),
      text(`Reason: ${cleanReason}`),
      text(`Version: ${config.log.version}${GAP}${config.log.madeFor}`)
    )
    .addSeparatorComponents(divider())
    .addMediaGalleryComponents(image(config.images.footer));

  try {
    const logChannel = await client.channels.fetch(config.logChannelId);
    await logChannel.send({ components: [log], flags: V2, allowedMentions: NO_PINGS });
  } catch (err) {
    console.error('tickets: could not send close log (check logChannelId in ticket/config.js):', err.message);
  }
}

// ---------- actions ----------

const ticketInfo = (interaction) => parseTopic(interaction.channel?.topic);

async function createTicket(interaction, typeKey) {
  const t = config.types[typeKey];
  if (!t) return;

  await interaction.deferReply({ flags: EPHEMERAL });

  const tosValue = first(interaction.fields.getCheckboxGroup('tos'));
  if (config.requireTos && tosValue !== 'yes') {
    return interaction.editReply({ content: config.messages.tosDeclined });
  }

  const guild = interaction.guild;
  const user = interaction.user;

  // Limit open tickets per person (also counts tickets from the dashboard/appeals menus)
  const open = guild.channels.cache.filter((c) => parseTopic(c.topic)?.opener === user.id);
  if (open.size >= config.maxOpenPerUser) {
    return interaction.editReply({
      content: fmt(config.messages.alreadyOpen, { channel: `<#${open.first().id}>` }),
    });
  }

  const reason = interaction.fields.getTextInputValue('reason').trim() || 'N/A';
  const extra = interaction.fields.getTextInputValue('additional').trim() || 'N/A';
  const staffId = first(interaction.fields.getStringSelectValues('staff'));
  const hasStaff = staffId && staffId !== 'none';
  const staffText = hasStaff ? `<@${staffId}>` : 'N/A';

  const ticketId = rand(5);
  const lookup = `${t.lookupPrefix}${rand(3)}${letters(2)}`;

  const botId = interaction.client.user.id;
  const memberPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
  ];

  const channel = await guild.channels.create({
    name: `${t.channelPrefix}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 90) || 'ticket',
    type: ChannelType.GuildText,
    parent: t.categoryId || null,
    topic: buildTopic({ id: ticketId, lookup, type: typeKey, opener: user.id }),
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: memberPerms },
      ...staffRolesFor(typeKey).map((id) => ({
        id,
        allow: [...memberPerms, PermissionFlagsBits.ManageMessages],
      })),
      {
        id: botId,
        allow: [...memberPerms, PermissionFlagsBits.ManageChannels],
      },
    ],
  });

  // Who gets pinged (hidden in a spoiler on the card): this ticket type's staff roles
  // + the staff member picked in the form
  const pingRoles = staffRolesFor(typeKey);
  const pingUsers = hasStaff ? [staffId] : [];
  const pings = [...pingRoles.map((id) => `<@&${id}>`), ...pingUsers.map((id) => `<@${id}>`)].join(' ');

  await channel.send({
    components: [
      buildTicketCard(t, {
        openerId: user.id,
        reason,
        extra,
        staffText,
        tos: tosValue === 'yes' ? 'Yes' : 'No',
        pings,
      }),
    ],
    flags: V2,
    allowedMentions: { parse: [], roles: pingRoles, users: pingUsers },
  });

  return interaction.editReply({
    content: fmt(config.messages.ticketCreated, { channel: `<#${channel.id}>` }),
  });
}

async function claimTicket(interaction) {
  const info = ticketInfo(interaction);
  if (!info || !isStaff(interaction.member, info.type)) {
    return interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
  }

  const claims = loadClaims();
  const current = claims[interaction.channelId]?.claimedBy;
  if (current) {
    return interaction.reply({
      content: fmt(config.messages.alreadyClaimed, { user: `<@${current}>` }),
      flags: EPHEMERAL,
      allowedMentions: NO_PINGS,
    });
  }

  claims[interaction.channelId] = { claimedBy: interaction.user.id };
  saveClaims(claims);

  return interaction.reply({
    content: fmt(config.messages.claimed, { user: `<@${interaction.user.id}>` }),
    allowedMentions: NO_PINGS,
  });
}

async function unclaimTicket(interaction) {
  const info = ticketInfo(interaction);
  if (!info || !isStaff(interaction.member, info.type)) {
    return interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
  }

  const claims = loadClaims();
  const current = claims[interaction.channelId]?.claimedBy;
  if (!current) {
    return interaction.reply({ content: config.messages.notClaimed, flags: EPHEMERAL });
  }
  if (
    current !== interaction.user.id &&
    !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return interaction.reply({ content: config.messages.notYourClaim, flags: EPHEMERAL });
  }

  delete claims[interaction.channelId];
  saveClaims(claims);

  return interaction.reply({
    content: fmt(config.messages.unclaimed, { user: `<@${interaction.user.id}>` }),
    allowedMentions: NO_PINGS,
  });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const info = ticketInfo(interaction);
  if (!info || !isStaff(interaction.member, info.type)) {
    return interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
  }

  await interaction.reply({
    content: fmt(config.messages.closing, { seconds: config.closeDelaySeconds }),
  });

  // Button close has no reason, so the log says N/A
  await logTicketClosed(interaction.client, channel, interaction.user.id, null);

  const claims = loadClaims();
  if (claims[channel.id]) {
    delete claims[channel.id];
    saveClaims(claims);
  }

  setTimeout(() => {
    channel
      .delete(`Ticket closed by ${interaction.user.tag}`)
      .catch((err) => console.error('tickets: could not delete channel:', err));
  }, config.closeDelaySeconds * 1000);
}

async function renameTicket(interaction) {
  const info = ticketInfo(interaction);
  if (!info || !isStaff(interaction.member, info.type)) {
    return interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
  }
  const raw = interaction.fields.getTextInputValue('name').trim();
  const name = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 90);
  if (!name) {
    return interaction.reply({
      content: 'That name isn\u2019t valid. Use letters, numbers, hyphens or underscores.',
      flags: EPHEMERAL,
    });
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  await interaction.channel.setName(name);
  return interaction.editReply({ content: fmt(config.messages.renamed, { name }) });
}

// ---------- router ----------
// Returns true if the interaction was a ticket one (so your other code can skip it).

async function handleTicketInteraction(interaction) {
  const id = interaction.customId;
  if (!id || !id.startsWith('ticket:')) return false;

  const parts = id.split(':');
  const [, action, arg] = parts;

  try {
    // Database browser (/tickets): staff only
    if (action === 'db') {
      if (!isStaff(interaction.member)) {
        await interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
      } else {
        await handleDbInteraction(interaction, parts.slice(2));
      }
      return true;
    }

    if (interaction.isButton()) {
      if (action === 'open') {
        if (!config.types[arg]) return true;
        await interaction.showModal(buildTicketModal(arg));
      } else if (action === 'claim') await claimTicket(interaction);
      else if (action === 'unclaim') await unclaimTicket(interaction);
      else if (action === 'close') await closeTicket(interaction);
      else if (action === 'rename') {
        const info = ticketInfo(interaction);
        if (!info || !isStaff(interaction.member, info.type)) {
          await interaction.reply({ content: config.messages.staffOnly, flags: EPHEMERAL });
        } else {
          await interaction.showModal(buildRenameModal());
        }
      }
    } else if (interaction.isModalSubmit()) {
      if (action === 'submit') await createTicket(interaction, arg);
      else if (action === 'renamesubmit') await renameTicket(interaction);
    }
  } catch (err) {
    console.error('tickets: error handling interaction:', err);
    const payload = { content: config.messages.error, flags: EPHEMERAL };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch {
      // interaction already expired, nothing else to do
    }
  }

  return true;
}

// ---------- text commands (-claim / -unclaim) ----------
// Same rules as the Claim / Unclaim buttons, but triggered by a normal message.

async function claimByMessage(message) {
  const info = parseTopic(message.channel.topic);
  if (!info) return; // not a ticket channel, ignore

  if (!isStaff(message.member, info.type)) {
    return message.reply({ content: config.messages.staffOnly, allowedMentions: NO_PINGS }).catch(() => {});
  }

  const claims = loadClaims();
  const current = claims[message.channel.id]?.claimedBy;
  if (current) {
    return message
      .reply({ content: fmt(config.messages.alreadyClaimed, { user: `<@${current}>` }), allowedMentions: NO_PINGS })
      .catch(() => {});
  }

  claims[message.channel.id] = { claimedBy: message.author.id };
  saveClaims(claims);

  return message.channel
    .send({ content: fmt(config.messages.claimed, { user: `<@${message.author.id}>` }), allowedMentions: NO_PINGS })
    .catch(() => {});
}

async function unclaimByMessage(message) {
  const info = parseTopic(message.channel.topic);
  if (!info) return; // not a ticket channel, ignore

  if (!isStaff(message.member, info.type)) {
    return message.reply({ content: config.messages.staffOnly, allowedMentions: NO_PINGS }).catch(() => {});
  }

  const claims = loadClaims();
  const current = claims[message.channel.id]?.claimedBy;
  if (!current) {
    return message.reply({ content: config.messages.notClaimed, allowedMentions: NO_PINGS }).catch(() => {});
  }
  if (
    current !== message.author.id &&
    !message.member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return message.reply({ content: config.messages.notYourClaim, allowedMentions: NO_PINGS }).catch(() => {});
  }

  delete claims[message.channel.id];
  saveClaims(claims);

  return message.channel
    .send({ content: fmt(config.messages.unclaimed, { user: `<@${message.author.id}>` }), allowedMentions: NO_PINGS })
    .catch(() => {});
}

module.exports = {
  buildPanel,
  buildTicketModal,
  handleTicketInteraction,
  claimByMessage,
  unclaimByMessage,
  logTicketClosed,
  isStaff,
};