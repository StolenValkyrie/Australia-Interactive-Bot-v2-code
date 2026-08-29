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
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

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
// SHARED CONSTANTS / HELPERS
// =========================

// Category all tickets get created under, regardless of type.
const TICKET_CATEGORY_ID = '1497142936461246464';

// Role pinged and given access on Partnerships tickets specifically.
const PARTNERSHIPS_ROLE_ID = '1537742446358696022';

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
// Claim state lives here instead of the channel topic. Discord shares one
// rate-limit bucket (2 changes / 10 min) across BOTH name and topic edits
// on a channel — if claim/unclaim kept calling setTopic(), it was eating
// the same budget -rename needs. Tracking claims in a file avoids ever
// touching name/topic during claim/unclaim.

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
        process.env.ACTIVITY_NAME || 'Discord';


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
        // TICKET BUTTONS
        // =========================

        if (interaction.isButton()) {


            // =========================
            // CHECK STAFF
            // =========================

            const isStaff = isStaffMember(interaction.member);


            // =========================
            // CLAIM TICKET
            // =========================

            if (
                interaction.customId ===
                'claim_ticket'
            ) {

                if (!isStaff) {

                    await interaction.reply({

                        content:
                            '❌ Only staff members can claim tickets.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                const claims = loadClaims();
                const existingClaim = claims[interaction.channel.id];


                if (existingClaim) {

                    const claimedUserId =
                        existingClaim.claimedBy;


                    if (
                        claimedUserId ===
                        interaction.user.id
                    ) {

                        await interaction.reply({

                            content:
                                '⚠️ You have already claimed this ticket.',

                            flags:
                                MessageFlags.Ephemeral
                        });

                        return;
                    }


                    const claimedUser =
                        await interaction.client.users
                            .fetch(
                                claimedUserId
                            )
                            .catch(
                                () => null
                            );


                    await interaction.reply({

                        content:
                            `❌ This ticket is already claimed by ${claimedUser ? claimedUser : `<@${claimedUserId}>`}.`,

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                claims[interaction.channel.id] = {
                    claimedBy: interaction.user.id
                };

                saveClaims(claims);


                await interaction.reply({

                    content:
                        `✅ ${interaction.user} has claimed this ticket.`
                });

                return;
            }


            // =========================
            // UNCLAIM TICKET
            // =========================

            if (
                interaction.customId ===
                'unclaim_ticket'
            ) {

                if (!isStaff) {

                    await interaction.reply({

                        content:
                            '❌ Only staff members can unclaim tickets.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                const claims = loadClaims();
                const existingClaim = claims[interaction.channel.id];


                if (!existingClaim) {

                    await interaction.reply({

                        content:
                            '⚠️ This ticket is not currently claimed.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                const claimedUserId =
                    existingClaim.claimedBy;


                if (
                    claimedUserId !==
                    interaction.user.id
                ) {

                    await interaction.reply({

                        content:
                            `❌ This ticket was claimed by <@${claimedUserId}>, so only they can unclaim it.`,

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                delete claims[interaction.channel.id];

                saveClaims(claims);


                await interaction.reply({

                    content:
                        `✅ ${interaction.user} has unclaimed this ticket.`
                });

                return;
            }


            // =========================
            // CLOSE TICKET
            // =========================

            if (
                interaction.customId ===
                'close_ticket'
            ) {

                if (!isStaff) {

                    await interaction.reply({

                        content:
                            '❌ Only staff members can close tickets.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                await interaction.reply({

                    content:
                        '🔒 Closing this ticket...',

                    flags:
                        MessageFlags.Ephemeral
                });


                setTimeout(
                    async () => {

                        try {

                            const claims = loadClaims();

                            if (claims[interaction.channel.id]) {
                                delete claims[interaction.channel.id];
                                saveClaims(claims);
                            }

                            await interaction.channel.delete();

                        } catch (error) {

                            console.error(
                                'Error closing ticket:',
                                error
                            );
                        }

                    },
                    1500
                );

                return;
            }


            return;
        }


        // =========================
        // TICKET SELECT MENU
        // =========================

        if (
            interaction.isStringSelectMenu()
        ) {

            if (
                interaction.customId !==
                'ticket_select'
            ) {
                return;
            }


            const selected =
                interaction.values[0];


            // =========================
            // GUIDELINES
            // =========================

            if (
                selected ===
                'guidelines'
            ) {

                const rulesEmbed =
                    new EmbedBuilder()

                        .setColor(
                            0x5865F2
                        )

                        .setTitle(
                            'Waratah Heights Rules'
                        )

                        .setDescription(
                            'Please read and follow all rules while participating in Waratah Heights.'
                        )

                        .addFields(

                            {
                                name:
                                    '🎭 Game Rules',

                                value:
                                    '**Metagaming** – Do not use OOC information to benefit from your RP.\n' +
                                    '**Powergaming** – Do not force RP actions; use "-tries-" instead of auto-success.\n' +
                                    '**New Life Rule (NLR)** – After dying, forget the events leading to your death and do not return to the same scene.\n' +
                                    '**Fear RP** – Value your life and act realistically when threatened.\n' +
                                    '**Scenes** – Keep scenes realistic, under 30 minutes unless approved, and do not interfere with other active scenes.\n' +
                                    '**Leaving Scenes** – Do not leave the game during an active RP scene.\n' +
                                    '**Roleplay Quality** – Stay in character, avoid trolling/OOC during scenes, don\u2019t start scenes in Safezones, and avoid repeating identical scenarios.\n' +
                                    '**Suicide/Terrorist RP** – Suicide RP, terrorism, or recreating terrorist events is prohibited.'
                            },

                            {
                                name:
                                    '🚗 Vehicle Rules',

                                value:
                                    '**Fail RP (FRP)** – RP injuries or vehicle damage after major crashes.\n' +
                                    '**Driving** – No unrealistic driving unless fleeing police.\n' +
                                    '**Pursuits** – Respect pursuit cooldowns and never spawn vehicles during pursuits.\n' +
                                    '**VDM** – Do not intentionally ram players or vehicles without valid RP.\n' +
                                    '**Desync Abuse** – Do not abuse lag or desync.\n' +
                                    '**Emergency Vehicles** – Always give way to emergency services.'
                            },

                            {
                                name:
                                    '🔫 Firearms & Weapons',

                                value:
                                    '• Respect firearm cooldowns.\n' +
                                    '• Firearms may only be used during active scenes.\n' +
                                    '• Staff cannot be taken hostage.\n' +
                                    '• No Random Deathmatch (RDM).\n' +
                                    '• Use firearms realistically; don\u2019t shoot over minor situations.\n' +
                                    '• No unnecessary shooting in public areas.\n' +
                                    '• No open carrying outside RP.\n' +
                                    '• Melee weapons may start scenes if realistic.\n' +
                                    '• Do not abuse downed/restrained players.\n' +
                                    '• No unrealistic weapon swapping during fights.'
                            },

                            {
                                name:
                                    '🚔 Police & Crime',

                                value:
                                    '• Damaged vehicles must stop fleeing.\n' +
                                    '• RP realistic surrenders when caught.\n' +
                                    '• Respect all pursuit/firearm cooldowns.\n' +
                                    '• LTAA (Leaving to Avoid Arrest) is prohibited.\n' +
                                    '• No crimes during Peacetime.\n' +
                                    '• Crimes require realistic motives.\n' +
                                    '• Robberies, kidnappings, and hostages must be planned realistically.\n' +
                                    '• Do not impersonate staff.\n' +
                                    '• No cop baiting.\n' +
                                    '• Maximum 4 people per criminal scene unless management approves.'
                            },

                            {
                                name:
                                    '🛡️ Staff Rules',

                                value:
                                    '• LTAP (Leaving to Avoid Punishment) is prohibited.\n' +
                                    '• Do not interrupt staff scenes.\n' +
                                    '• Remain respectful and professional with staff.\n' +
                                    '• Follow staff decisions.'
                            },

                            {
                                name:
                                    '⚔️ Gang Rules',

                                value:
                                    '• Unapproved gangs are prohibited.\n' +
                                    '• Gang RP must remain realistic with valid motives.\n' +
                                    '• Gang territories and wars require staff approval.\n' +
                                    '• Only approved members may wear gang colours.\n' +
                                    '• All gang activity must follow general RP and Peacetime rules.'
                            },

                            {
                                name:
                                    '💬 Discord Rules',

                                value:
                                    '• Treat everyone respectfully; discrimination or harassment is prohibited.\n' +
                                    '• Use channels correctly.\n' +
                                    '• No advertising.\n' +
                                    '• No spam or excessive pinging.\n' +
                                    '• Do not ask for roles or promotions.\n' +
                                    '• You must be at least 13 years old.'
                            },

                            {
                                name:
                                    '⚠️ Disclaimer',

                                value:
                                    'Breaking these rules may result in warnings, kicks, timeouts, bans, or permanent bans depending on severity.\n\n' +
                                    'Management+ may issue punishments at their discretion if actions threaten the community, its members, or the integrity of Waratah Heights, even if a specific rule is not listed.'
                            }
                        )

                        .setFooter({

                            text:
                                'Waratah Heights • Rules & Guidelines • Website: australia-interactive-website.web.app'
                        });


                await interaction.reply({

                    embeds:
                        [rulesEmbed],

                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }


            // =========================
            // TICKET TYPES
            // =========================

            const ticketNames = {

                support:
                    'support',

                report:
                    'report',

                partnerships:
                    'partnerships',

                other:
                    'other'
            };


            const ticketType =
                ticketNames[selected] ||
                'other';


            // =========================
            // SAFE USERNAME
            // =========================

            const safeUsername =
                sanitizeName(interaction.user.username, 'user');


            // =========================
            // TICKET NAME
            // =========================

            const ticketName =
                `${ticketType}-${safeUsername}`;


            // =========================
            // CHECK EXISTING TICKET
            // =========================

            const existingTicket =
                interaction.guild.channels.cache.find(

                    channel =>

                        channel.type === 0 &&

                        channel.topic?.includes(
                            `ticket-owner:${interaction.user.id}`
                        )
                );


            if (existingTicket) {

                await interaction.reply({

                    content:
                        `❌ You already have a ticket: ${existingTicket}`,

                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }


            try {

                // =========================
                // CREATE CHANNEL
                // =========================

                const permissionOverwrites = [

                    // Everyone
                    {
                        id:
                            interaction.guild.id,

                        deny: [
                            'ViewChannel'
                        ]
                    },


                    // Ticket Owner
                    {
                        id:
                            interaction.user.id,

                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory'
                        ]
                    },


                    // Bot
                    {
                        id:
                            interaction.client.user.id,

                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory',
                            'ManageChannels'
                        ]
                    }
                ];


                // =========================
                // STAFF PERMISSIONS
                // =========================

                if (
                    ticketType ===
                    'report'
                ) {

                    // REPORT ROLE ONLY
                    permissionOverwrites.push({

                        id:
                            '1499382533803085975',

                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory'
                        ]
                    });

                } else if (
                    ticketType ===
                    'partnerships'
                ) {

                    // PARTNERSHIPS ROLE
                    permissionOverwrites.push({

                        id:
                            PARTNERSHIPS_ROLE_ID,

                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory'
                        ]
                    });

                } else {

                    // NORMAL STAFF ROLE (support / other)
                    permissionOverwrites.push({

                        id:
                            process.env.STAFF_ROLE_ID,

                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory'
                        ]
                    });
                }


                const ticketChannel =
                    await interaction.guild.channels.create({

                        name:
                            ticketName,

                        type:
                            0,

                        parent:
                            TICKET_CATEGORY_ID,

                        topic:
                            `ticket-owner:${interaction.user.id};ticket-type:${ticketType}`,

                        permissionOverwrites:
                            permissionOverwrites
                    });


                // =========================
                // CONFIRMATION
                // =========================

                await interaction.reply({

                    content:
                        `✅ Your **${ticketType}** ticket has been created: ${ticketChannel}`,

                    flags:
                        MessageFlags.Ephemeral
                });


                // =========================
                // TICKET PING
                // =========================

                const ticketPing =
                    ticketType === 'report'

                        ? '<@&1499382533803085975>'

                        : ticketType === 'partnerships'

                            ? `<@&${PARTNERSHIPS_ROLE_ID}>`

                            : `<@&${process.env.STAFF_ROLE_ID}>`;


                // =========================
                // TICKET CONTAINER
                // =========================

                const container =
                    new ContainerBuilder()

                        .setAccentColor(
                            0x5865F2
                        )


                        // =========================
                        // TITLE
                        // =========================

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()

                                .setContent(

                                    `# ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`
                                )
                        )


                        // =========================
                        // DESCRIPTION
                        // =========================

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()

                                .setContent(

                                    `Welcome <@${interaction.user.id}>!\n\n` +

                                    `Thanks for contacting support. Please explain your issue and a member of our staff team will assist you shortly.\n\n` +

                                    `Ping: ${ticketPing}`
                                )
                        )


                        // =========================
                        // SEPARATOR
                        // =========================

                        .addSeparatorComponents(

                            new SeparatorBuilder()

                                .setDivider(true)

                                .setSpacing(1)
                        )


                        // =========================
                        // BUTTONS
                        // =========================

                        .addActionRowComponents(

                            new ActionRowBuilder()

                                .addComponents(

                                    new ButtonBuilder()

                                        .setCustomId(
                                            'claim_ticket'
                                        )

                                        .setLabel(
                                            'Claim'
                                        )

                                        .setEmoji(
                                            '🙋'
                                        )

                                        .setStyle(
                                            ButtonStyle.Primary
                                        ),


                                    new ButtonBuilder()

                                        .setCustomId(
                                            'unclaim_ticket'
                                        )

                                        .setLabel(
                                            'Unclaim'
                                        )

                                        .setEmoji(
                                            '↩️'
                                        )

                                        .setStyle(
                                            ButtonStyle.Secondary
                                        ),


                                    new ButtonBuilder()

                                        .setCustomId(
                                            'close_ticket'
                                        )

                                        .setLabel(
                                            'Close Ticket'
                                        )

                                        .setEmoji(
                                            '🔒'
                                        )

                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                )
                        );


                // =========================
                // SEND TICKET PANEL
                // =========================

                await ticketChannel.send({

                    components:
                        [container],

                    flags:
                        MessageFlags.IsComponentsV2
                });


            } catch (error) {

                console.error(
                    'Error creating ticket:',
                    error
                );


                if (
                    !interaction.replied
                ) {

                    await interaction.reply({

                        content:
                            '❌ There was an error while creating the ticket!',

                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                return;
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


// =========================
// TICKET RENAME COMMAND (-rename)
// =========================
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

                getString(name, required = false) {
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
