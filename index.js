
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

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

            const isStaff =
                interaction.member?.roles?.cache?.has(
                    process.env.STAFF_ROLE_ID
                ) ||
                interaction.member?.roles?.cache?.has(
                    '1499382533803085975'
                );


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


                const topic =
                    interaction.channel.topic || '';


                const claimedMatch =
                    topic.match(
                        /claimed-by:(\d+)/
                    );


                if (claimedMatch) {

                    const claimedUserId =
                        claimedMatch[1];


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


                const newTopic =
                    topic
                        ? `${topic};claimed-by:${interaction.user.id}`
                        : `claimed-by:${interaction.user.id}`;


                await interaction.channel.setTopic(
                    newTopic
                );


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


                const topic =
                    interaction.channel.topic || '';


                const claimedMatch =
                    topic.match(
                        /claimed-by:(\d+)/
                    );


                if (!claimedMatch) {

                    await interaction.reply({

                        content:
                            '⚠️ This ticket is not currently claimed.',

                        flags:
                            MessageFlags.Ephemeral
                    });

                    return;
                }


                const claimedUserId =
                    claimedMatch[1];


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


                const newTopic =
                    topic.replace(
                        /;?claimed-by:\d+/,
                        ''
                    );


                await interaction.channel.setTopic(
                    newTopic || null
                );


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
                                    '**Roleplay Quality** – Stay in character, avoid trolling/OOC during scenes, don’t start scenes in Safezones, and avoid repeating identical scenarios.\n' +
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
                                    '• Use firearms realistically; don’t shoot over minor situations.\n' +
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
                interaction.user.username
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9-_]/g,
                        ''
                    )
                    .slice(
                        0,
                        70
                    ) ||
                'user';


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

                } else {

                    // NORMAL STAFF ROLE
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
// LOGIN
// =========================

console.log('TOKEN exists:', !!process.env.TOKEN);
console.log('TOKEN length:', process.env.TOKEN?.length);

client.login(process.env.BOT_TOKEN);
