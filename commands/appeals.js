const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');

// Only this user is allowed to use /appeals
const ALLOWED_USER_ID = '1347447934597464089';

// ...and only if they also have this role
const ALLOWED_ROLE_ID = '1531068885397405696';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('appeals')
        .setDescription('Opens the ban appeals panel')
        // Hidden from everyone by default; server admins still need to
        // grant it via Integrations if they want to layer that on top
        // of the role check below.
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        // =========================
        // USER + ROLE RESTRICTION
        // =========================

        if (
            interaction.user.id !==
            ALLOWED_USER_ID
        ) {

            await interaction.reply({

                content:
                    '❌ You do not have permission to use this command.',

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }


        const hasRole =
            interaction.member?.roles?.cache?.has(
                ALLOWED_ROLE_ID
            );

        if (!hasRole) {

            await interaction.reply({

                content:
                    '❌ You do not have permission to use this command.',

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }


        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)

            // Title
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('# Ban Appeals')
            )

            // Description
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `Select the type of ban appeal you'd like to open in ${interaction.guild.name}.`
                    )
            )

            // Separator
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(1)
            )

            // Appeal selection menu
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('appeals_select')
                            .setPlaceholder('Select an appeal type')
                            .addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Discord Ban Appeal')
                                    .setDescription(
                                        'Appeal a ban from the Discord server'
                                    )
                                    .setValue('discord_ban_appeal')
                                    .setEmoji('🔨'),

                                new StringSelectMenuOptionBuilder()
                                    .setLabel('Game Ban Appeal')
                                    .setDescription(
                                        'Appeal a ban from the game/server'
                                    )
                                    .setValue('game_ban_appeal')
                                    .setEmoji('🎮')
                            )
                    )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};