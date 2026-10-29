// ============================================================
//  TICKET SYSTEM CONFIG
//  Everything you'll want to edit (text, images, IDs) is here.
//  You shouldn't need to touch handler.js.
// ============================================================

module.exports = {
  // ---------- Images (paste your links) ----------
  images: {
    banner: 'https://cdn.phototourl.com/member/2026-10-28-5ab2bd9c-b474-4b46-b689-c830cf464af3.png', // the big "SUPPORT" image at the top
    // Pre-filled with the footer your other panels use. Swap it if the old ticket bar was different.
    footer: 'https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png',
  },

  // Accent colour bar on the left of the cards. null = none (like your old tickets).
  // Use e.g. 0x5865F2 to match your other panels.
  accentColor: null,

  // Channel the /supportpanel command posts the panel in. '' = the channel you run it in.
  panelChannelId: '1563481620978335744',

  // ---------- IDs ----------
  // Roles that can see tickets and use Claim / Unclaim / Close / Rename
  // Pre-filled from your index.js: STAFF_ROLE_ID from .env plus your report staff role.
  // These roles can use Claim / Unclaim / Close / Rename on every ticket type.
  staffRoleIds: [process.env.STAFF_ROLE_ID, '1495734364347043880'].filter(Boolean),
  // Channel where the "Ticket Closed" log gets sent (still needs your channel ID)
  logChannelId: '1492495219713773728',

  // ---------- Behaviour ----------
  maxOpenPerUser: 1, // how many tickets one person can have open at once
  closeDelaySeconds: 5, // wait before the channel is deleted after pressing Close
  requireTos: true, // if true, picking "No" on the TOS question blocks the ticket

  // ---------- Support panel (the message with the 4 buttons) ----------
  panel: {
    title: '## Support',
    description: '> Need support? Open a ticket for our staff to assist.',
  },

  // ---------- Ticket types ----------
  // The key (general, highrankings...) is used internally, don't change it
  // once tickets exist. Everything else is editable.
  //   label         = text on the panel button + modal title
  //   ticketTitle   = heading inside the ticket channel
  //   typeName      = shown in the close log ("Ticket Type: ...")
  //   lookupPrefix  = start of the Lookup ID (GEN301AI)
  //   categoryId    = category the ticket channel is created in
//   staffRoleIds  = roles that can see this ticket type (replaces the global list for visibility)
  //   channelPrefix = ticket channel name becomes prefix-username
  types: {
    general: {
      label: 'General',
      ticketTitle: '## General Ticket',
      typeName: 'General',
      lookupPrefix: 'GEN',
      categoryId: '1497142936461246464',
      staffRoleIds: [process.env.STAFF_ROLE_ID].filter(Boolean), // who sees this ticket type
      channelPrefix: 'general',
    },
    highrankings: {
      label: 'High Rankings',
      ticketTitle: '## High Ranking Ticket',
      typeName: 'High Ranking',
      lookupPrefix: 'HIG',
      categoryId: '1497142936461246464',
      staffRoleIds: ['1468059306992730215'], // who sees this ticket type
      channelPrefix: 'highrank',
    },
    partnerships: {
      label: 'Partnerships',
      ticketTitle: '## Partnership Ticket',
      typeName: 'Partnership',
      lookupPrefix: 'PAR',
      categoryId: '1497142936461246464',
      staffRoleIds: ['1495734364347043880'], // who sees this ticket type
      channelPrefix: 'partner',
    },
    report: {
      label: 'Report',
      ticketTitle: '## Report Ticket',
      typeName: 'Report',
      lookupPrefix: 'REP',
      categoryId: '1497142936461246464',
      staffRoleIds: ['1495734364347043880'], // who sees this ticket type
      channelPrefix: 'report',
    },
  },

  // ---------- Staff dropdown in the modal ----------
  // First entry must stay as N/A. Add staff as { label: 'Name', value: 'THEIR_USER_ID' }
  // (Discord allows max 25 entries.)
  staffOptions: [
    { label: 'N/A', value: 'none' },
    // { label: 'Anthony Albanese', value: '123456789012345678' },
  ],

  // ---------- Modal (the pop-up form) text ----------
  modal: {
    reasonLabel: 'Reason For Opening',
    additionalLabel: 'Additional Information',
    staffLabel: 'Do you need a specific staff member?',
    staffDescription: 'If so select the person.',
    tosLabel: 'Are you willing to follow Ticket TOS?',
    renameTitle: 'Rename Ticket',
    renameLabel: 'New channel name',
  },

  // ---------- Messages (edit freely) ----------
  // {user} {staff} {seconds} get replaced automatically
  messages: {
    // Plain message sent in the ticket channel just before the ticket card (pings people)
    welcomePing: '{user} {staff}',
    ticketCreated: 'Your ticket has been created: {channel}',
    alreadyOpen: 'You already have the maximum number of open tickets: {channel}',
    tosDeclined: 'You must agree to follow the Ticket TOS to open a ticket.',
    staffOnly: 'Only staff can use this button.',
    claimed: '{user} has claimed this ticket.',
    alreadyClaimed: 'This ticket is already claimed by {user}.',
    notClaimed: 'This ticket is not claimed.',
    notYourClaim: 'Only the staff member who claimed this ticket can unclaim it.',
    unclaimed: '{user} has unclaimed this ticket.',
    closing: 'This ticket will be closed in {seconds} seconds...',
    renamed: 'Ticket renamed to {name}.',
    error: 'Something went wrong. Please tell a staff member.',
  },

  // ---------- Close log ----------
  log: {
    title: '## Ticket Closed',
    database: 'Unavailable', // shown as "Database: ..."
    version: '1.0',
    madeFor: 'Made for Australia Interactive (AI1X25)',
  },
};