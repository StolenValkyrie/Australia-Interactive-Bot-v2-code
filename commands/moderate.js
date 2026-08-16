const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderate')
        .setDescription('Moderate a member')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The member to warn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Timeout a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The member to timeout')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration in minutes')
                        .setMinValue(1)
                        .setMaxValue(40320)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the timeout')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The member to kick')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the kick')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The member to ban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(true)
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


        try {

            // =========================
            // WARN
            // =========================

            if (subcommand === 'warn') {

                // For now, warnings are sent to the user.
                // You can add a database later to permanently store them.

                try {
                    await user.send(
                        `⚠️ You have been warned in **${interaction.guild.name}**.\n\n` +
                        `**Reason:** ${reason}`
                    );
                } catch {
                    // User may have DMs disabled
                }

                return interaction.reply({
                    content:
                        `⚠️ **${user.tag}** has been warned.\n` +
                        `**Reason:** ${reason}`,
                    flags: MessageFlags.Ephemeral
                });
            }


            // =========================
            // TIMEOUT
            // =========================

            if (subcommand === 'timeout') {

                const duration =
                    interaction.options.getInteger(
                        'duration'
                    );

                const milliseconds =
                    duration * 60 * 1000;

                await member.timeout(
                    milliseconds,
                    reason
                );

                return interaction.reply({
                    content:
                        `🔇 **${user.tag}** has been timed out for **${duration} minute(s)**.\n` +
                        `**Reason:** ${reason}`
                });
            }


            // =========================
            // KICK
            // =========================

            if (subcommand === 'kick') {

                await member.kick(reason);

                return interaction.reply({
                    content:
                        `👢 **${user.tag}** has been kicked.\n` +
                        `**Reason:** ${reason}`
                });
            }


            // =========================
            // BAN
            // =========================

            if (subcommand === 'ban') {

                await member.ban({
                    reason: reason
                });

                return interaction.reply({
                    content:
                        `🔨 **${user.tag}** has been banned.\n` +
                        `**Reason:** ${reason}`
                });
            }

        } catch (error) {

            console.error(
                'Moderation error:',
                error
            );

            return interaction.reply({
                content:
                    '❌ I could not perform that moderation action. Check my permissions and role hierarchy.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};