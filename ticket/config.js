module.exports = {
  // images
  images: {
    banner: 'PASTE_BANNER_IMAGE_URL_HERE', // the big "SUPPORT" image at the top
    // Pre-filled with the footer your other panels use. Swap it if the old ticket bar was different.
    footer: 'https://cdn.phototourl.com/free/2026-08-29-8be225ce-4ec4-4806-9441-8328a38846bc.png',
  },

  // Accent colour bar on the left of the cards. null = none (like your old tickets).
  // Use e.g. 0x5865F2 to match your other panels.
  accentColor: null,

  // Channel the /supportpanel command posts the panel in. '' = the channel you run it in.
  panelChannelId: '',

  // ids
  staffRoleIds: [process.env.STAFF_ROLE_ID, '1499382533803085975'].filter(Boolean),
  logChannelId: 'LOG_CHANNEL_ID_HERE',

  // works (behavior)
  maxOpenPerUser: 1, // how many tickets one person can have open at once
  closeDelaySeconds: 5, // wait before the channel is deleted after pressing Close
  requireTos: true, // if true, picking "No" on the TOS question blocks the ticket

  // open panel
  panel: {
    title: '## Support',
    description: '> Need support? Open a ticket for our staff to assist.',
  },

  // ticket types
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
      staffRoleIds: [process.env.STAFF_ROLE_ID].filter(Boolean), // who sees this ticket type
      channelPrefix: 'highrank',
    },
    partnerships: {
      label: 'Partnerships',
      ticketTitle: '## Partnership Ticket',
      typeName: 'Partnership',
      lookupPrefix: 'PAR',
      categoryId: '1497142936461246464',
      staffRoleIds: ['1537742446358696022'], // who sees this ticket type
      channelPrefix: 'partner',
    },
    report: {
      label: 'Report',
      ticketTitle: '## Report Ticket',
      typeName: 'Report',
      lookupPrefix: 'REP',
      categoryId: '1497142936461246464',
      staffRoleIds: ['1499382533803085975'], // who sees this ticket type
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

  // modal
  modal: {
    reasonLabel: 'Reason For Opening',
    additionalLabel: 'Additional Information',
    staffLabel: 'Do you need a specific staff member?',
    staffDescription: 'If so select the person.',
    tosLabel: 'Are you willing to follow Ticket TOS?',
    renameTitle: 'Rename Ticket',
    renameLabel: 'New channel name',
  },

  // mesgs
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

  // closing log or smth
  log: {
    title: '## Ticket Closed',
    database: 'Unavailable', // shown as "Database: ..."
    version: '1.0',
    madeFor: 'Made for Australia Interactive (AI1X25)',
  },
};