const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');

// =====================================
// PRESET MAIN IMAGE
// =====================================

const MAIN_IMAGE =
    'https://images-ext-1.discordapp.net/external/WUzjcotyAei5sB34AG_5JzjWelB8H7oIn2JjoxeOSn0/https/api.kite.onl/v1/assets/cq7mltbfbn9y95tb?format=webp';


module.exports = {

    // =====================================
    // COMMAND
    // =====================================

    data: new SlashCommandBuilder()
        .setName('infraction')
        .setDescription('Issue an infraction to a member')

        // User
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member receiving the infraction')
                .setRequired(true)
        )

        // Reason
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the infraction')
                .setRequired(true)
        )

        // Punishment
        .addStringOption(option =>
            option
                .setName('punishment')
                .setDescription('Punishment given')
                .setRequired(true)
        )

        // Role
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role associated with the infraction')
                .setRequired(false)
        )

        // Notes
        .addStringOption(option =>
            option
                .setName('notes')
                .setDescription('Additional notes')
                .setRequired(false)
        )

        // Evidence upload
        .addAttachmentOption(option =>
            option
                .setName('evidence')
                .setDescription('Upload evidence for this infraction')
                .setRequired(false)
        ),


    async execute(interaction) {

        // =====================================
        // GET OPTIONS
        // =====================================

        const user =
            interaction.options.getUser('user');

        const reason =
            interaction.options.getString('reason');

        const punishment =
            interaction.options.getString('punishment');

        const role =
            interaction.options.getRole('role');

        const notes =
            interaction.options.getString('notes') ||
            'No additional notes provided.';

        const evidence =
            interaction.options.getAttachment('evidence');


        // =====================================
        // DATE
        // =====================================

        const date = new Date().toLocaleDateString(
            'en-AU',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }
        );


        // =====================================
        // MAIN V2 CONTAINER
        // =====================================

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)

            // =================================
            // HEADER
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '# 🇦🇺 Australia Interactive\n' +
                        '## 🔔 | Infraction'
                    )
            )

            // =================================
            // MAIN IMAGE
            // =================================

            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(MAIN_IMAGE)
                    )
            )

            // =================================
            // SEPARATOR
            // =================================

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // =================================
            // INTRO
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `<@${user.id}> has been issued an infraction by <@${interaction.user.id}>.`
                    )
            )

            // =================================
            // DETAILS
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 📋 Infraction Details\n\n` +
                        `**User:** <@${user.id}>\n` +
                        `**Reason:** ${reason}\n` +
                        `**Punishment:** ${punishment}\n` +
                        `**Role:** ${role ? `<@&${role.id}>` : 'N/A'}\n` +
                        `**Notes:** ${notes}\n` +
                        `**Date:** ${date}\n` +
                        `**Issued By:** <@${interaction.user.id}>`
                    )
            )

            // =================================
            // SEPARATOR
            // =================================

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // =================================
            // FOOTER
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        'Australia Interactive • Staff Infraction System'
                    )
            );


        // =====================================
        // EVIDENCE
        // =====================================

        const components = [container];


        if (evidence) {

            const evidenceContainer =
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)

                    // Evidence title
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# 📸 Evidence'
                            )
                    )

                    // Separator
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setDivider(true)
                            .setSpacing(1)
                    )

                    // Evidence image
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder()
                            .addItems(
                                new MediaGalleryItemBuilder()
                                    .setURL(evidence.url)
                            )
                    )

                    // Separator
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setDivider(true)
                            .setSpacing(1)
                    )

                    // Evidence footer
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `Evidence uploaded by <@${interaction.user.id}>`
                            )
                    );

            components.push(evidenceContainer);
        }


        // =====================================
        // SEND
        // =====================================

        await interaction.reply({
            components,
            flags: MessageFlags.IsComponentsV2
        });
    }
};