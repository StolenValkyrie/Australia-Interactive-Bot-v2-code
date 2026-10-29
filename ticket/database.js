// ============================================================
//  TICKET DATABASE
//  Saves every closed ticket (details + transcript) to files:
//    data/tickets.json            -> one record per closed ticket
//    data/transcripts/<id>.txt    -> the full chat transcript
//  No extra packages needed.
// ============================================================

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const indexFile = path.join(dataDir, 'tickets.json');
const transcriptDir = path.join(dataDir, 'transcripts');

const MAX_MESSAGES = 2000; // stops huge tickets from hanging the bot

function ensureDirs() {
  fs.mkdirSync(transcriptDir, { recursive: true });
}

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveIndex(index) {
  ensureDirs();
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
}

// ---------- transcript building ----------

// Pulls the text out of component messages (like the ticket card) so it shows in the transcript
function flattenComponents(list, out = []) {
  for (const c of list ?? []) {
    if (typeof c.content === 'string' && c.content) out.push(c.content);
    if (c.components) flattenComponents(c.components, out);
  }
  return out;
}

const fmtTime = (ms) =>
  new Date(ms).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour12: false });

function formatMessage(m) {
  const parts = [];
  if (m.content) parts.push(m.content);
  parts.push(...flattenComponents(m.components));
  for (const e of m.embeds ?? []) {
    if (e.title) parts.push(`[embed] ${e.title}`);
    if (e.description) parts.push(e.description);
  }
  for (const a of m.attachments?.values?.() ?? []) parts.push(`[attachment] ${a.url}`);

  const body = (parts.join('\n') || '[no text]').replace(/\n/g, '\n    ');
  const name = m.author?.username ?? 'unknown';
  return `[${fmtTime(m.createdTimestamp)}] ${name}${m.author?.bot ? ' [BOT]' : ''}: ${body}`;
}

async function fetchAllMessages(channel) {
  const all = [];
  let before;
  while (all.length < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return all.reverse(); // oldest first
}

// ---------- saving ----------

async function saveClosedTicket({ client, channel, info, typeName, closerId, reason }) {
  const [opener, closer] = await Promise.all([
    client.users.fetch(info.opener).catch(() => null),
    client.users.fetch(closerId).catch(() => null),
  ]);

  let hasTranscript = false;
  let messageCount = 0;

  try {
    const messages = await fetchAllMessages(channel);
    messageCount = messages.length;

    const header = [
      `Ticket transcript`,
      `Ticket ID: ${info.id}`,
      `Lookup ID: ${info.lookup}`,
      `Type: ${typeName}`,
      `Opener: ${opener?.username ?? 'unknown'} (${info.opener})`,
      `Closed by: ${closer?.username ?? 'unknown'} (${closerId})`,
      `Reason: ${reason || 'N/A'}`,
      `Messages: ${messageCount}`,
      '='.repeat(40),
      '',
    ].join('\n');

    ensureDirs();
    fs.writeFileSync(
      path.join(transcriptDir, `${channel.id}.txt`),
      header + messages.map(formatMessage).join('\n')
    );
    hasTranscript = true;
  } catch (err) {
    console.error('tickets: could not save transcript:', err.message);
  }

  const index = loadIndex();
  index[channel.id] = {
    channelId: channel.id,
    ticketId: info.id,
    lookup: info.lookup,
    type: info.type,
    typeName,
    openerId: info.opener,
    openerName: opener?.username ?? 'unknown',
    closerId,
    closerName: closer?.username ?? 'unknown',
    reason: (reason || '').toString().trim().slice(0, 500) || 'N/A',
    openedAt: channel.createdTimestamp,
    closedAt: Date.now(),
    messageCount,
    hasTranscript,
  };
  saveIndex(index);
}

// ---------- reading ----------

// filter: { userId } or { query } (query matches lookup ID, ticket ID or type)
function listTickets(filter = {}) {
  let rows = Object.values(loadIndex());

  if (filter.userId) rows = rows.filter((r) => r.openerId === filter.userId);

  if (filter.query) {
    const q = filter.query.toLowerCase();
    rows = rows.filter((r) =>
      [r.lookup, r.ticketId, r.typeName].some((v) => String(v).toLowerCase().includes(q))
    );
  }

  return rows.sort((a, b) => b.closedAt - a.closedAt); // newest first
}

function getTicket(channelId) {
  return loadIndex()[channelId] ?? null;
}

// Returns the transcript file path, or null if there isn't one
function transcriptPath(channelId) {
  const file = path.join(transcriptDir, `${channelId}.txt`);
  return fs.existsSync(file) ? file : null;
}

module.exports = { saveClosedTicket, listTickets, getTicket, transcriptPath };