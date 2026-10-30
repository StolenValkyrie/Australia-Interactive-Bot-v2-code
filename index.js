require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    Client, GatewayIntentBits, Partials, Collection, Events, ActivityType,
    PresenceUpdateStatus, REST, Routes, MessageFlags, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
} = require('discord.js');

const { handleTicketInteraction, claimByMessage, unclaimByMessage, logTicketClosed } = require('./ticket/handler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

require('./logger.js')(client);
require('./antiping')(client);
client.commands = new Collection();

function sanitizeName(str, fallback = 'ticket') {
    return (str || '').toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 90) || fallback;
}

function isStaffMember(member) {
    return Boolean(
        member?.roles?.cache?.has(process.env.STAFF_ROLE_ID) ||
        member?.roles?.cache?.has('1499382533803085975')
    );
}

const claimsFile = path.join(__dirname, 'data', 'claims.json');

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
    } catch (error) {
        console.error('❌ Could not write claims.json:', error);
    }
}

// -close: staff-only ticket close command.
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith('-close')) return;
    if (!(message.channel.topic || '').includes('ticket-owner:')) return;

    if (!isStaffMember(message.member)) {
        await message.reply({ content: '❌ Only staff members can close tickets.' }).catch(() => {});
        return;
    }

    const reason = message.content.slice('-close'.length).trim();

    await message.channel.send({
        content: `🔒 **Ticket Closing**\n\n**Closed by:** ${message.author}\n**Reason:** ${reason || 'N/A'}\n\nThis ticket will be closed shortly.`,
    }).catch(() => {});

    try {
        await logTicketClosed(message.client, message.channel, message.author.id, reason);
    } catch (error) {
        console.error('Error logging ticket close:', error);
    }

    setTimeout(async () => {
        try {
            const claims = loadClaims();

            if (claims[message.channel.id]) {
                delete claims[message.channel.id];
                saveClaims(claims);
            }

            await message.channel.delete();
        } catch (error) {
            console.error('Error closing ticket with -close:', error);
        }
    }, 1500);
});

// Load slash commands.
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
    throw new Error(`Commands folder was not found: ${commandsPath}`);
}

for (const file of fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));

    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
    }
}

async function deployCommands() {
    const commands = [...client.commands.values()].map(command => command.data.toJSON());

    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
        console.error('❌ Cannot deploy commands: BOT_TOKEN, CLIENT_ID, or GUILD_ID is missing.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    try {
        console.log(`Deploying ${commands.length} command(s)...`);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Commands deployed!');
    } catch (error) {
        console.error('❌ Command deployment failed:', error);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    const activityTypeMap = {
        PLAYING: ActivityType.Playing,
        WATCHING: ActivityType.Watching,
        LISTENING: ActivityType.Listening,
        STREAMING: ActivityType.Streaming,
        COMPETING: ActivityType.Competing,
    };

    const statusMap = {
        online: PresenceUpdateStatus.Online,
        idle: PresenceUpdateStatus.Idle,
        dnd: PresenceUpdateStatus.DoNotDisturb,
        invisible: PresenceUpdateStatus.Invisible,
    };

    const statusType = (process.env.BOT_STATUS || 'online').toLowerCase();
    const activityType = (process.env.ACTIVITY_TYPE || 'PLAYING').toUpperCase();

    client.user.setPresence({
        status: statusMap[statusType] || PresenceUpdateStatus.Online,
        activities: [{
            name: process.env.ACTIVITY_NAME || 'discord.gg/ausi',
            type: activityTypeMap[activityType] ?? ActivityType.Playing,
        }],
    });

    console.log('✅ Bot status set!');
    await deployCommands();
});

// All Discord interactions are handled inside this one async listener.
client.on(Events.InteractionCreate, async interaction => {
    try {
        if (await handleTicketInteraction(interaction)) return;

        if (interaction.isButton()) {
            // RULES BUTTON
            if (interaction.customId === 'rules') {
                const rulesContainer = new ContainerBuilder()
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL('https://cdn.phototourl.com/member/2026-10-29-17504ecd-49eb-4b0d-a08d-ea893fbdf086.png'),
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent([
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
                    ].join('\n')))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL('https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png'),
                    ));

                await interaction.reply({
                    components: [rulesContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });

                return;
            }


            // MEMBER COUNT BUTTON
            if (interaction.customId === 'memberbutton') {
                const guild = interaction.guild;

                if (!guild) {
                    await interaction.reply({
                        content: 'This button can only be used inside a server.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                // Defer the reply in case Discord needs time to fetch members.
                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral,
                });

                try {
                    // Fetch all guild members so the human/bot counts are accurate.
                    await guild.members.fetch();

                    const members = guild.members.cache;
                    const totalMembers = guild.memberCount;

                    const botCount = members.filter(
                        member => member.user.bot
                    ).size;

                    const humanCount = members.filter(
                        member => !member.user.bot
                    ).size;

                    // Fetch the latest server data, including boost count.
                    const freshGuild = await guild.fetch();

                    const boostCount = freshGuild.premiumSubscriptionCount ?? 0;
                    const boostLevel = freshGuild.premiumTier;

                    const vanityURL = 'https://discord.gg/ausi';

                    const memberContainer = new ContainerBuilder()
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    'https://cdn.phototourl.com/member/2026-10-29-17504ecd-49eb-4b0d-a08d-ea893fbdf086.png'
                                ),
                            ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(1),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent([
                                '# Server Stats',
                                '',
                                '## Total Members',
                                `**${totalMembers.toLocaleString()}**`,
                                '',
                                '## Members',
                                `**${humanCount.toLocaleString()}**`,
                                '',
                                '## Bots',
                                `**${botCount.toLocaleString()}**`,
                                '',
                                '## Server Boosts',
                                `**${boostCount.toLocaleString()}**`,
                                `**Boost Level:** ${boostLevel}`,
                                '',
                                '## 🔗 Server Invite',
                                '🔗 **discord.gg/ausi**',
                            ].join('\n')),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(1),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `*Requested by ${interaction.user.username}*`,
                            ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(1),
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    'https://cdn.phototourl.com/member/2026-10-28-d4604693-3a08-4375-aa89-4890cbb8a10a.png'
                                ),
                            ),
                        );

                    await interaction.editReply({
                        components: [memberContainer],
                        flags: MessageFlags.IsComponentsV2
                            | MessageFlags.Ephemeral,
                    });
                } catch (error) {
                    console.error(
                        'Error fetching server statistics:',
                        error,
                    );

                    await interaction.editReply({
                        content:
                            '❌ Could not load server statistics. Please try again later.',
                        components: [],
                    }).catch(() => {});
                }

                return;
            }


            // DOCK VERIFICATION BUTTON
            if (interaction.customId === 'dock_verify') {
                if (!process.env.DOCK_API_KEY || !process.env.DOCK_PID) {
                    await interaction.reply({
                        content: '❌ Verification is not configured. Please contact staff.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const response = await fetch('https://api.docksys.xyz/api/v1/verify/session', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.DOCK_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pid: process.env.DOCK_PID,
                        clientId: interaction.user.id,
                        guildId: interaction.guild?.id,
                    }),
                });

                const payload = await response.json().catch(() => ({}));
                console.log('Dock response:', payload);

                if (!response.ok) {
                    await interaction.reply({
                        content: '❌ Could not create your verification session. Please try again later.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const verifyUrl = payload?.data?.verifyUrl;

                if (!verifyUrl) {
                    console.error('No verifyUrl returned by Dock:', payload);

                    await interaction.reply({
                        content: '❌ Dock did not return a verification link.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                const verifyButton = new ButtonBuilder()
                    .setLabel('Verify with Dock')
                    .setStyle(ButtonStyle.Link)
                    .setURL(verifyUrl);

                await interaction.reply({
                    content: '🔗 Click the button below to verify your Roblox account:',
                    components: [new ActionRowBuilder().addComponents(verifyButton)],
                    flags: MessageFlags.Ephemeral,
                });

                return;
            }
        }

        // SLASH COMMANDS — keep this inside the async listener.
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        await command.execute(interaction);
    } catch (error) {
        console.error('Interaction handler error:', error);

        if (!interaction.isRepliable() || interaction.replied || interaction.deferred) {
            if (interaction.isRepliable() && (interaction.replied || interaction.deferred)) {
                await interaction.followUp({
                    content: 'There was an error while handling this interaction.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
            return;
        }

        await interaction.reply({
            content: 'There was an error while handling this interaction.',
            flags: MessageFlags.Ephemeral,
        }).catch(() => {});
    }
});

// PERSISTENT STICKY HANDLER
const stickyFile = path.join(__dirname, 'data', 'stickies.json');

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    let stickies;

    try {
        stickies = JSON.parse(fs.readFileSync(stickyFile, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('❌ Could not read stickies.json:', error);
        }
        return;
    }

    const sticky = stickies[message.channel.id];
    if (!sticky) return;

    try {
        try {
            const oldSticky = await message.channel.messages.fetch(sticky.messageId);
            await oldSticky.delete();
        } catch {
            // The previous sticky message may have been deleted already.
        }

        const newSticky = await message.channel.send({
            content: `📌 **Sticky Message**\n\n${sticky.message}`,
        });

        stickies[message.channel.id].messageId = newSticky.id;
        fs.writeFileSync(stickyFile, JSON.stringify(stickies, null, 4));
    } catch (error) {
        console.error('❌ Error updating sticky:', error);
    }
});

// -rename: staff-only ticket channel rename.
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith('-rename ')) return;
    if (!(message.channel.topic || '').includes('ticket-owner:')) return;

    if (!isStaffMember(message.member)) {
        await message.reply({ content: '❌ Only staff members can rename tickets.' }).catch(() => {});
        return;
    }

    const rawName = message.content.slice('-rename '.length).trim();

    if (!rawName) {
        await message.reply({ content: '❌ Usage: `-rename <new-name>`' }).catch(() => {});
        return;
    }

    const newName = sanitizeName(rawName, '');

    if (!newName) {
        await message.reply({
            content: '❌ That name isn’t valid — use letters, numbers, hyphens, or underscores.',
        }).catch(() => {});
        return;
    }

    try {
        await message.channel.setName(newName);
        await message.reply({ content: `✅ Renamed channel to **${newName}**.` });
    } catch (error) {
        console.error('Error renaming channel via -rename:', error);

        await message.reply({
            content: '❌ Failed to rename the channel. Discord only allows 2 renames per 10 minutes per channel — try again shortly.',
        }).catch(() => {});
    }
});

// -claim and -unclaim ticket commands.
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim().toLowerCase();

    try {
        if (content === '-claim') {
            await claimByMessage(message);
        } else if (content === '-unclaim') {
            await unclaimByMessage(message);
        }
    } catch (error) {
        console.error('Error handling ticket claim command:', error);
    }
});

// Prefix commands (-command) reuse each command's execute() function.
const PREFIX = '-';

function getSubcommandNames(command) {
    try {
        return (command.data.toJSON().options || [])
            .filter(option => option.type === 1)
            .map(option => option.name);
    } catch {
        return [];
    }
}

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;
    if (message.content.startsWith('-rename ')) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = (args.shift() || '').toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);
    if (!command) return;

    let requiredPerms = null;

    try {
        requiredPerms = command.data.toJSON().default_member_permissions;
    } catch {
        requiredPerms = null;
    }

    if (requiredPerms && !message.member?.permissions?.has(BigInt(requiredPerms))) {
        await message.reply({
            content: '❌ You do not have permission to use this command.',
        }).catch(() => {});
        return;
    }

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
        isRepliable: () => true,

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

            getString() {
                return args.join(' ').trim() || null;
            },
        },

        deferReply: async () => {
            deferredFlag = true;
            await message.channel.sendTyping().catch(() => {});
        },

        reply: async payload => {
            const options = typeof payload === 'string' ? { content: payload } : {
                content: payload?.content,
                embeds: payload?.embeds,
                components: payload?.components,
            };

            sentMessage = await message.reply(options).catch(() => null);
            repliedFlag = true;
            return sentMessage;
        },

        editReply: async payload => {
            const options = typeof payload === 'string' ? { content: payload } : {
                content: payload?.content,
                embeds: payload?.embeds,
                components: payload?.components,
            };

            if (sentMessage) {
                return sentMessage.edit(options).catch(() => null);
            }

            sentMessage = await message.reply(options).catch(() => null);
            repliedFlag = true;
            return sentMessage;
        },

        followUp: async payload => {
            const options = typeof payload === 'string' ? { content: payload } : {
                content: payload?.content,
                embeds: payload?.embeds,
                components: payload?.components,
            };

            return message.channel.send(options).catch(() => null);
        },
    };

    try {
        await command.execute(fakeInteraction);
    } catch (error) {
        console.error(`Error executing -${commandName}:`, error);

        await message.reply({
            content: `❌ ${error.message || 'Something went wrong running that command.'}`,
        }).catch(() => {});
    }
});

// Login.
if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is missing from the environment.');
}

client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ Discord login failed:', error);
}); 