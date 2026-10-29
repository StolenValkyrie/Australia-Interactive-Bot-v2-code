require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    Events,
    ActivityType,
    PresenceUpdateStatus,
    REST,
    Routes,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require('discord.js');

// Support ticket system (General / High Rankings / Partnerships / Report)
const { handleTicketInteraction, claimByMessage, unclaimByMessage, logTicketClosed } = require('./ticket/handler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

require('./logger.js')(client);
client.commands = new Collection();

// =========================
// SHARED HELPERS
// =========================

// Discord channel names: lowercase, alphanumeric + hyphen/underscore only.
function sanitizeName(str, fallback = 'ticket') {
    return (
        (str || '')
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '')
            .slice(0, 90) || fallback
    );
}

function isStaffMember(member) {
    return (
        member?.roles?.cache?.has(process.env.STAFF_ROLE_ID) ||
        member?.roles?.cache?.has('1499382533803085975') ||
        false
    );
}

// =========================
// TICKET CLAIM STORE
// =========================
// Same file the ticket system (ticket/handler.js) uses. Needed here so
// -close can clear a ticket's claim when it deletes the channel.

const claimsFile = path.join(__dirname, 'data', 'claims.json');

function loadClaims() {
    try {
        return JSON.parse(fs.readFileSync(claimsFile, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveClaims(claims) {
    try {
        fs.mkdirSync(path.dirname(claimsFile), { recursive: true });
        fs.writeFileSync(claimsFile, JSON.stringify(claims, null, 4));
    } catch (error) {
        console.error('❌ Could not write claims.json:', error);
    }
}

// =========================
// TICKET CLOSE COMMAND (-close)
// =========================
// Usage: -close <reason>   (reason is optional, N/A if left out)
// Staff-only, ticket channels only.

client.on(
    Events.MessageCreate,
    async message => {

        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith('-close')) return;

        // =========================
        // CHECK TICKET CHANNEL
        // =========================

        const topic = message.channel.topic || '';

        if (!topic.includes('ticket-owner:')) {
            return;
        }

        // =========================
        // CHECK STAFF
        // =========================

        if (!isStaffMember(message.member)) {

            await message.reply({
                content:
                    '❌ Only staff members can close tickets.'
            }).catch(() => {});

            return;
        }

        // =========================
        // GET REASON
        // =========================

        const reason =
            message.content
                .slice('-close'.length)
                .trim();

        // Reason is optional: with no reason the log and message say N/A

        // =========================
        // CLOSING MESSAGE
        // =========================

        await message.channel.send({
            content:
                `🔒 **Ticket Closing**\n\n` +
                `**Closed by:** ${message.author}\n` +
                `**Reason:** ${reason || 'N/A'}\n\n` +
                `This ticket will be closed shortly.`
        }).catch(() => {});

        // =========================
        // LOG THE CLOSE
        // =========================

        await logTicketClosed(
            message.client,
            message.channel,
            message.author.id,
            reason
        );

        // =========================
        // DELETE AFTER DELAY
        // =========================

        setTimeout(
            async () => {

                try {

                    const claims = loadClaims();

                    if (
                        claims[message.channel.id]
                    ) {

                        delete claims[
                            message.channel.id
                        ];

                        saveClaims(claims);
                    }

                    await message.channel.delete();

                } catch (error) {

                    console.error(
                        'Error closing ticket with -close:',
                        error
                    );

                }

            },
            1500
        );

    }
);


// =========================
// LOAD COMMANDS
// =========================

const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {

    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {

        client.commands.set(
            command.data.name,
            command
        );

        console.log(
            `Loaded command: ${command.data.name}`
        );
    }
}


// =========================
// DEPLOY COMMANDS
// =========================

async function deployCommands() {

    const commands = [];

    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' })
        .setToken(process.env.BOT_TOKEN);

    try {

        console.log(
            `Deploying ${commands.length} command(s)...`
        );

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log('✅ Commands deployed!');

    } catch (error) {

        console.error(
            '❌ Command deployment failed:'
        );

        console.error(error);
    }
}


// =========================
// BOT READY
// =========================

client.once(Events.ClientReady, async () => {

    console.log(
        `✅ Logged in as ${client.user.tag}!`
    );

    const statusType =
        process.env.BOT_STATUS || 'online';

    const activityType =
        process.env.ACTIVITY_TYPE || 'PLAYING';

    const activityName =
        process.env.ACTIVITY_NAME || 'discord.gg/ausi';


    const activityTypeMap = {

        PLAYING: ActivityType.Playing,

        WATCHING: ActivityType.Watching,

        LISTENING: ActivityType.Listening,

        STREAMING: ActivityType.Streaming,

        COMPETING: ActivityType.Competing
    };


    const statusMap = {

        online: PresenceUpdateStatus.Online,

        idle: PresenceUpdateStatus.Idle,

        dnd: PresenceUpdateStatus.DoNotDisturb,

        invisible: PresenceUpdateStatus.Invisible
    };


    client.user.setPresence({

        status:
            statusMap[statusType],

        activities: [

            {
                name:
                    activityName,

                type:
                    activityTypeMap[activityType]
            }
        ]
    });


    console.log(
        '✅ Bot status set!'
    );

    await deployCommands();
});


// =========================
// INTERACTION HANDLER
// =========================

client.on(
    Events.InteractionCreate,
    async interaction => {

        // =========================
        // SUPPORT TICKETS
        // =========================
        // Buttons + modals whose customId starts with "ticket:"

        if (await handleTicketInteraction(interaction)) return;


        // =========================
        // DASHBOARD BUTTONS
        // =========================

        if (interaction.isButton()) {
            try {
                // RULES BUTTON

if (interaction.customId === 'rules') {
    const rulesContainer = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(
                    'https://cdn.phototourl.com/member/2026-10-29-17504ecd-49eb-4b0d-a08d-ea893fbdf086.png'
                )
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(1)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                [
                    '# Rules',
                    '',
                    '## 1. Be Respectful',
                    'Treat everyone with respect. Harassment and personal attacks are not allowed.',
                    '',
                    '## 2. No Spam',
                    'Avoid spam, flooding, and unnecessary repeated messages.',
                    '',
                    '## 3. Follow Discord ToS',
                    'Follow Discord’s Terms of Service and Community Guidelines.',
                    '',
                    '## 4. No Unauthorised Advertising',
                    'Do not advertise without staff permission.',
                    '',
                    '## 5. Follow Staff Instructions',
                    'Listen to moderators and follow their instructions.',
                    '',
                    '## 6. Keep Channels Appropriate',
                    'Use the correct channels and follow their guidelines.',
                    '',
                    '## 7. No Exploiting',
                    'Do not abuse bots, exploits, or server features.',
                    '',
                    '## 8. Use Common Sense',
                    'Respect the community and help keep the server welcoming.',
                    '',
                    'Breaking these rules may result in moderation action, including a kick or ban depending on severity.',
                ].join('\n')
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(1)
        )
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(
                    'https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png'
                )
            )
        );

    return interaction.reply({
        components: [rulesContainer],
        flags:
            MessageFlags.IsComponentsV2 |
            MessageFlags.Ephemeral,
    });
}


                // MEMBER COUNT BUTTON

if (interaction.customId === 'memberbutton') {
    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    try {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.editReply({
                content: 'This button can only be used inside a server.',
            });
        }

        const members = await guild.members.fetch();
        const total = members.size;
        const bots = members.filter(member => member.user.bot).size;
        const humans = total - bots;

        const memberContainer = new ContainerBuilder()
            // TOP IMAGE
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(
                        'https://cdn.phototourl.com/member/2026-10-29-17504ecd-49eb-4b0d-a08d-ea893fbdf086.png'
                    )
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // MEMBER COUNT TEXT
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    [
                        '# Server Member Count',
                        '',
                        '## 👥 Total Members',
                        `**${total.toLocaleString()}**`,
                        '',
                        '## 🧑 Human Members',
                        `**${humans.toLocaleString()}**`,
                        '',
                        '## 🤖 Bots',
                        `**${bots.toLocaleString()}**`,
                    ].join('\n')
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `*Count requested by ${interaction.user.username}*`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // BOTTOM IMAGE
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(
                        'https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png'
                    )
                )
            );

        return interaction.editReply({
            components: [memberContainer],
            flags: MessageFlags.IsComponentsV2,
        });

    } catch (error) {
        console.error('Member count error:', error);

        return interaction.editReply({
            content: 'Could not fetch the member count. Please try again later.',
        });
    }
};


        // =========================
        // DOCK VERIFICATION
        // =========================

        if (
            interaction.isButton() &&
            interaction.customId === 'dock_verify'
        ) {

            try {

                const response = await fetch(
                    'https://api.docksys.xyz/api/v1/verify/session',
                    {
                        method: 'POST',

                        headers: {
                            Authorization:
                                `Bearer ${process.env.DOCK_API_KEY}`,

                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            pid:
                                process.env.DOCK_PID,

                            clientId:
                                interaction.user.id,

                            guildId:
                                interaction.guild.id
                        })
                    }
                );

                const payload =
                    await response.json();

                console.log('Dock response:', payload);

                if (!response.ok) {

                    await interaction.reply({
                        content:
                            '❌ Could not create your verification session. Please try again later.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }

                const verifyUrl =
                    payload?.data?.verifyUrl;

                if (!verifyUrl) {

                    console.error(
                        'No verifyUrl returned by Dock:',
                        payload
                    );

                    await interaction.reply({
                        content:
                            '❌ Dock did not return a verification link.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }

                const verifyButton =
                    new ButtonBuilder()
                        .setLabel('Verify with Dock')
                        .setStyle(ButtonStyle.Link)
                        .setURL(verifyUrl);

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            verifyButton
                        );

                await interaction.reply({
                    content:
                        '🔗 Click the button below to verify your Roblox account:',

                    components:
                        [row],

                    flags:
                        MessageFlags.Ephemeral
                });

            } catch (error) {

                console.error(
                    'Dock verification error:',
                    error
                );

                if (!interaction.replied) {

                    await interaction.reply({
                        content:
                            '❌ Something went wrong while creating your verification session.',

                        flags:
                            MessageFlags.Ephemeral
                    });
                }
            }

            return;
        }


        // =========================
        // SLASH COMMANDS
        // =========================

        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }


        const command =
            interaction.client.commands.get(
                interaction.commandName
            );


        if (!command) {

            console.error(
                `No command matching ${interaction.commandName} was found.`
            );

            return;
        }


        try {

            await command.execute(
                interaction
            );

        } catch (error) {

            console.error(
                `Error executing ${interaction.commandName}`
            );

            console.error(error);


            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp({

                    content:
                        'There was an error while executing this command!',

                    flags:
                        MessageFlags.Ephemeral
                });

            } else {

                await interaction.reply({

                    content:
                        'There was an error while executing this command!',

                    flags:
                        MessageFlags.Ephemeral
                });
            }
        }
    }
);


// =========================
// PERSISTENT STICKY HANDLER
// =========================

const stickyFile =
    path.join(
        __dirname,
        'data',
        'stickies.json'
    );


client.on(
    Events.MessageCreate,
    async message => {

        if (
            message.author.bot
        ) return;

        if (
            !message.guild
        ) return;


        let stickies;


        try {

            stickies =
                JSON.parse(

                    fs.readFileSync(
                        stickyFile,
                        'utf8'
                    )
                );

        } catch (error) {

            console.error(
                '❌ Could not read stickies.json:',
                error
            );

            return;
        }


        const sticky =
            stickies[
                message.channel.id
            ];


        if (!sticky) return;


        try {

            try {

                const oldSticky =
                    await message.channel.messages.fetch(
                        sticky.messageId
                    );

                await oldSticky.delete();

            } catch {
                // Previous sticky doesn't exist
            }


            const newSticky =
                await message.channel.send({

                    content:
                        `📌 **Sticky Message**\n\n${sticky.message}`
                });


            stickies[
                message.channel.id
            ].messageId =
                newSticky.id;


            fs.writeFileSync(

                stickyFile,

                JSON.stringify(
                    stickies,
                    null,
                    4
                )
            );


        } catch (error) {

            console.error(
                '❌ Error updating sticky:',
                error
            );
        }
    }
);

// TICKET RENAME COMMAND (-rename)
// Text-prefix command, staff-only, only works inside ticket channels.
// Usage: -rename <new-name>

client.on(
    Events.MessageCreate,
    async message => {

        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith('-rename ')) return;

        const topic = message.channel.topic || '';
        const isTicketChannel = topic.includes('ticket-owner:');

        if (!isTicketChannel) return;

        if (!isStaffMember(message.member)) {
            await message.reply({
                content: '❌ Only staff members can rename tickets.'
            }).catch(() => {});
            return;
        }

        const rawName = message.content.slice('-rename '.length).trim();

        if (!rawName) {
            await message.reply({
                content: '❌ Usage: `-rename <new-name>`'
            }).catch(() => {});
            return;
        }

        const newName = sanitizeName(rawName, '');

        if (!newName) {
            await message.reply({
                content: '❌ That name isn\u2019t valid — use letters, numbers, hyphens, or underscores.'
            }).catch(() => {});
            return;
        }

        try {

            await message.channel.setName(newName);

            await message.reply({
                content: `✅ Renamed channel to **${newName}**.`
            });

        } catch (error) {

            console.error('Error renaming channel via -rename:', error);

            await message.reply({
                content: '❌ Failed to rename the channel. Discord only allows 2 renames per 10 minutes per channel — try again shortly.'
            }).catch(() => {});
        }
    }
);


// =========================
// TICKET CLAIM COMMANDS (-claim / -unclaim)
// =========================
// Staff-only, ticket channels only. Same rules as the Claim / Unclaim buttons.

client.on(
    Events.MessageCreate,
    async message => {

        if (message.author.bot) return;
        if (!message.guild) return;

        const content = message.content.trim().toLowerCase();

        if (content === '-claim') {
            await claimByMessage(message);
        } else if (content === '-unclaim') {
            await unclaimByMessage(message);
        }
    }
);


// =========================
// GENERIC PREFIX COMMANDS (-command)
// =========================
// Lets every slash command also run as a "-command" text message, reusing
// the same command.execute() logic by faking a minimal interaction object.
//
// Limitations:
// - Ephemeral replies aren't private in a text message — they just post
//   normally in the channel.
// - Multi-argument commands (e.g. a command needing a user AND a reason)
//   aren't parsed apart — everything after the (sub)command is passed as
//   one string to any getString() call. Commands with a single text
//   argument (like /tts say) work fine; commands expecting multiple
//   distinct options may need their command file adjusted for proper
//   text-command parsing.

const PREFIX = '-';

function getSubcommandNames(command) {
    try {
        const json = command.data.toJSON();
        return (json.options || [])
            .filter(opt => opt.type === 1) // ApplicationCommandOptionType.Subcommand
            .map(opt => opt.name);
    } catch (error) {
        return [];
    }
}

client.on(
    Events.MessageCreate,
    async message => {

        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith(PREFIX)) return;

        // Already handled by the dedicated -rename listener above.
        if (message.content.startsWith('-rename ')) return;

        const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
        const commandName = (args.shift() || '').toLowerCase();

        if (!commandName) return;

        const command = client.commands.get(commandName);
        if (!command) return; // not a recognized command — ignore silently


        // =========================
        // PERMISSION CHECK
        // =========================
        // Mirrors whatever setDefaultMemberPermissions() the slash command
        // was given, so -command can't bypass restrictions /command has.

        let requiredPerms = null;

        try {
            requiredPerms = command.data.toJSON().default_member_permissions;
        } catch (error) {
            requiredPerms = null;
        }

        if (requiredPerms) {

            const hasPerms =
                message.member?.permissions?.has(BigInt(requiredPerms));

            if (!hasPerms) {

                await message.reply({
                    content: '❌ You do not have permission to use this command.'
                }).catch(() => {});

                return;
            }
        }


        // =========================
        // FAKE INTERACTION
        // =========================

        const subcommandNames = getSubcommandNames(command);

        let sentMessage = null;
        let deferredFlag = false;
        let repliedFlag = false;

        const fakeInteraction = {

            commandName,
            user: message.author,
            member: message.member,
            guild: message.guild,
            guildId: message.guild.id,
            channel: message.channel,
            client: message.client,

            isChatInputCommand: () => true,

            get replied() {
                return repliedFlag;
            },

            get deferred() {
                return deferredFlag;
            },

            options: {

                getSubcommand(required = true) {

                    const first = (args[0] || '').toLowerCase();

                    if (subcommandNames.includes(first)) {
                        return args.shift().toLowerCase();
                    }

                    if (required) {
                        throw new Error(
                            `Missing subcommand. Usage: -${commandName} <${subcommandNames.join('|')}>`
                        );
                    }

                    return null;
                },

                getString(required = false) {
                    const value = args.join(' ').trim();
                    return value || null;
                },
            },

            deferReply: async () => {
                deferredFlag = true;
                await message.channel.sendTyping().catch(() => {});
            },

            reply: async payload => {

                const content =
                    typeof payload === 'string' ? payload : payload.content;

                sentMessage = await message.reply({
                    content,
                    embeds: payload?.embeds,
                    components: payload?.components,
                }).catch(() => null);

                repliedFlag = true;

                return sentMessage;
            },

            editReply: async payload => {

                const content =
                    typeof payload === 'string' ? payload : payload.content;

                if (sentMessage) {
                    return sentMessage.edit({
                        content,
                        embeds: payload?.embeds,
                        components: payload?.components,
                    }).catch(() => null);
                }

                sentMessage = await message.reply({
                    content,
                    embeds: payload?.embeds,
                    components: payload?.components,
                }).catch(() => null);

                repliedFlag = true;

                return sentMessage;
            },

            followUp: async payload => {

                const content =
                    typeof payload === 'string' ? payload : payload.content;

                return message.channel.send({
                    content,
                    embeds: payload?.embeds,
                    components: payload?.components,
                }).catch(() => null);
            },
        };

        try {

            await command.execute(fakeInteraction);

        } catch (error) {

            console.error(`Error executing -${commandName}:`, error);

            await message.reply({
                content: `❌ ${error.message || 'Something went wrong running that command.'}`
            }).catch(() => {});
        }
    }
);


// =========================
// LOGIN
// =========================

client.login(process.env.BOT_TOKEN);