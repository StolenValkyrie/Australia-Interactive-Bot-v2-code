const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require('discord.js');

// =====================================
// PRESET BANNER / FOOTER IMAGES
// =====================================
// NOTE: placeholders reusing infraction.js's banner — swap these for
// verify.js's actual URLs if you want an exact match.

const BANNER_IMAGE =
    'https://images-ext-1.discordapp.net/external/WUzjcotyAei5sB34AG_5JzjWelB8H7oIn2JjoxeOSn0/https/api.kite.onl/v1/assets/cq7mltbfbn9y95tb?format=webp';

const FOOTER_IMAGE =
    'https://images-ext-1.discordapp.net/external/WUzjcotyAei5sB34AG_5JzjWelB8H7oIn2JjoxeOSn0/https/api.kite.onl/v1/assets/cq7mltbfbn9y95tb?format=webp';

// Channel the moderation log gets posted to.
const LOG_CHANNEL_ID = '1521449826166767687';

const PUNISHMENT_LABELS = {
    warn: 'Warning',
    timeout: 'Timeout',
    kick: 'Kick',
    ban: 'Ban',
};

function buildModOptions(subcommand, { includeDuration } = {}) {
    subcommand
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member to moderate')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason')
                .setRequired(true)
        );

    if (includeDuration) {
        subcommand.addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Duration in minutes')
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        );
    }

    subcommand
        .addStringOption(option =>
            option
                .setName('notes')
                .setDescription('Additional notes')
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName('evidence')
                .setDescription('Upload evidence for this action')
                .setRequired(false)
        );

    return subcommand;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderate')
        .setDescription('Moderate a member')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )

        .addSubcommand(subcommand =>
            buildModOptions(
                subcommand
                    .setName('warn')
                    .setDescription('Warn a member')
            )
        )

        .addSubcommand(subcommand =>
            buildModOptions(
                subcommand
                    .setName('timeout')
                    .setDescription('Timeout a member'),
                { includeDuration: true }
            )
        )

        .addSubcommand(subcommand =>
            buildModOptions(
                subcommand
                    .setName('kick')
                    .setDescription('Kick a member')
            )
        )

        .addSubcommand(subcommand =>
            buildModOptions(
                subcommand
                    .setName('ban')
                    .setDescription('Ban a member')
            )
        ),

    async execute(interaction) {

        // Make sure the person using the command can moderate
        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand =
            interaction.options.getSubcommand();

        const user =
            interaction.options.getUser('user');

        const reason =
            interaction.options.getString('reason');

        const notes =
            interaction.options.getString('notes') ||
            'No additional notes provided.';

        const evidence =
            interaction.options.getAttachment('evidence');

        // Get the guild member
        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ That user is not in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Don't allow moderating yourself
        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot moderate yourself.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Don't allow moderating the server owner
        if (user.id === interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ You cannot moderate the server owner.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Role hierarchy check
        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    '❌ You cannot moderate someone with an equal or higher role than you.',
                flags: MessageFlags.Ephemeral
            });
        }


        let durationText = 'N/A';

        try {

            // =========================
            // WARN
            // =========================

            if (subcommand === 'warn') {

                try {
                    await user.send(
                        `⚠️ You have been warned in **${interaction.guild.name}**.\n\n` +
                        `**Reason:** ${reason}`
                    );
                } catch {
                    // User may have DMs disabled
                }
            }


            // =========================
            // TIMEOUT
            // =========================

            if (subcommand === 'timeout') {

                const duration =
                    interaction.options.getInteger('duration');

                const milliseconds =
                    duration * 60 * 1000;

                await member.timeout(milliseconds, reason);

                durationText = `${duration} minute(s)`;
            }


            // =========================
            // KICK
            // =========================

            if (subcommand === 'kick') {
                await member.kick(reason);
            }


            // =========================
            // BAN
            // =========================

            if (subcommand === 'ban') {
                await member.ban({ reason });
            }

        } catch (error) {

            console.error('Moderation error:', error);

            return interaction.reply({
                content:
                    '❌ I could not perform that moderation action. Check my permissions and role hierarchy.',
                flags: MessageFlags.Ephemeral
            });
        }


        // =========================
        // QUICK CONFIRMATION TO STAFF
        // =========================

        await interaction.reply({
            content: `✅ **${user.tag}** — ${PUNISHMENT_LABELS[subcommand]} logged in <#${LOG_CHANNEL_ID}>.`,
            flags: MessageFlags.Ephemeral
        });


        // =========================
        // MOD LOG MESSAGE
        // =========================

        const date = new Date().toLocaleDateString(
            'en-AU',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }
        );

        const logContainer = new ContainerBuilder()
            .setAccentColor(0x5865F2)

            // Banner
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(BANNER_IMAGE)
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )

            // Title + details
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# Moderation Action\n\n` +
                    `**Suspects Discord Username (Ping them):** <@${user.id}>\n` +
                    `**Moderator's Names:** <@${interaction.user.id}>\n` +
                    `**Reason:** ${reason}\n` +
                    `**Punishment:** ${PUNISHMENT_LABELS[subcommand]}\n` +
                    `**Punishment Duration:** ${durationText}\n` +
                    `**Date of punishment:** ${date}\n` +
                    `**Notes:** ${notes}`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )

            // Footer image
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(FOOTER_IMAGE)
                    )
            );

        const logComponents = [logContainer];

        if (evidence) {

            const evidenceContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# 📸 Evidence')
                )

                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )

                .addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(evidence.url)
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Evidence uploaded by <@${interaction.user.id}>`
                    )
                );

            logComponents.push(evidenceContainer);
        }

        const logChannel = await interaction.client.channels
            .fetch(LOG_CHANNEL_ID)
            .catch(() => null);

        if (!logChannel) {
            console.error(`moderate: could not find log channel ${LOG_CHANNEL_ID}`);
            return;
        }

        try {
            await logChannel.send({
                components: logComponents,
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error('moderate: failed to post log message:', error);
        }
    }
};
