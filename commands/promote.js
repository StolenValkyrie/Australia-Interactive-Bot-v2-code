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
        .setName('promotion')
        .setDescription('Issue a promotion to a member')

        // User
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member being promoted')
                .setRequired(true)
        )

        // New Role
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The new role being given')
                .setRequired(true)
        )

        // Reason
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the promotion')
                .setRequired(true)
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
                .setDescription('Upload evidence for this promotion')
                .setRequired(false)
        ),


    async execute(interaction) {

        // =====================================
        // GET OPTIONS
        // =====================================

        const user =
            interaction.options.getUser('user');

        const role =
            interaction.options.getRole('role');

        const reason =
            interaction.options.getString('reason');

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
            .setAccentColor(0x57F287)

            // =================================
            // HEADER
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '# 🇦🇺 Australia Interactive\n' +
                        '## 🎉 | Promotion'
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
                        `<@${user.id}> has been promoted by <@${interaction.user.id}>. Congratulations!`
                    )
            )

            // =================================
            // DETAILS
            // =================================

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 📋 Promotion Details\n\n` +
                        `**User:** <@${user.id}>\n` +
                        `**New Role:** <@&${role.id}>\n` +
                        `**Reason:** ${reason}\n` +
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
                        'Australia Interactive • Staff Promotion System'
                    )
            );


        // =====================================
        // EVIDENCE
        // =====================================

        const components = [container];


        if (evidence) {

            const evidenceContainer =
                new ContainerBuilder()
                    .setAccentColor(0x57F287)

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
