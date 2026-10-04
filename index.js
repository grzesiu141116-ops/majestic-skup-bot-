const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

// PAMIĘTAJ: Zmień ten ID na ID swojego prywatnego kanału dla admina/konsoli
const ADMIN_CHANNEL_ID = '123456789012345678'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);

    // Rejestracja komendy /setup_skup
    const commands = [{
        name: 'setup_skup',
        description: 'Wysyła panel skupu na dany kanał (Tylko Admin)'
    }];

    try {
        await client.application.commands.set(commands);
        console.log('⚡ Pomyślnie zarejestrowano komendę /setup_skup');
    } catch (error) {
        console.error('❌ Błąd rejestracji komend:', error);
    }
});

// INTERAKCJE (PRZYCISKI, MODALE, KOMENDY)
client.on('interactionCreate', async (interaction) => {
    
    // 1. Obsługa Komendy /setup_skup
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup_skup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Brak uprawnień!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛒 SKUP UNIKATOWYCH PRZEDMIOTÓW - MAJESTIC RP')
                .setDescription(
                    'Potrzebujesz **szybkiej gotówki** od ręki?\n' +
                    'Masz unikatowy przedmiot ze skrzynki, rzadkie ubranie lub akcesorium i nikt nie chce go kupić na rynku?\n\n' +
                    '**Sprzedaj go u nas!**\n' +
                    '• Wypłata gotówki w 15-30 minut w grze.\n' +
                    '• Bez zbędnego czekania i wystawiania na rynku.\n' +
                    '• Skupujemy wyłącznie rzadkie/mityczne przedmioty, ubrania z karnetów i unikaty.\n\n' +
                    '👇 *Kliknij poniższy przycisk, aby złożyć formularz wyceny!*'
                )
                .setColor('#0099ff')
                .setFooter({ text: 'MajesticRP Pawnbroker • Szybka Kasa' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_buyout_btn')
                    .setLabel('💰 Sprzedaj Przedmiot (Szybka Kasa)')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '✅ Panel skupu został wysłany!', ephemeral: true });
        }
    }

    // 2. Kliknięcie przycisku "Sprzedaj Przedmiot" przez gracza
    if (interaction.isButton() && interaction.customId === 'start_buyout_btn') {
        const modal = new ModalBuilder()
            .setCustomId('buyout_modal')
            .setTitle('Formularz Skupu - MajesticRP');

        const categoryInput = new TextInputBuilder()
            .setCustomId('category')
            .setLabel('Kategoria przedmiotu')
            .setPlaceholder('np. Maska, Nakrycie głowy, Góra, Akcesoria')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const itemNameInput = new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Dokładna nazwa i wariant przedmiotu')
            .setPlaceholder('np. Słuchawki Apple V2 (Białe)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const priceInput = new TextInputBuilder()
            .setCustomId('price')
            .setLabel('Twoja oczekiwana cena ($)')
            .setPlaceholder('np. 4000000')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const staticIdInput = new TextInputBuilder()
            .setCustomId('static_id')
            .setLabel('Nick w grze i Static ID')
            .setPlaceholder('np. Jan Kowalski #12345')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const proofUrlInput = new TextInputBuilder()
            .setCustomId('proof_url')
            .setLabel('Link do zrzutu ekranu (Imgur/Discord)')
            .setPlaceholder('https://i.imgur.com/example.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(categoryInput),
            new ActionRowBuilder().addComponents(itemNameInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(staticIdInput),
            new ActionRowBuilder().addComponents(proofUrlInput)
        );

        await interaction.showModal(modal);
    }

    // 3. Wysyłanie formularza przez gracza
    if (interaction.isModalSubmit() && interaction.customId === 'buyout_modal') {
        const category = interaction.fields.getTextInputValue('category');
        const itemName = interaction.fields.getTextInputValue('item_name');
        const priceStr = interaction.fields.getTextInputValue('price');
        const staticId = interaction.fields.getTextInputValue('static_id');
        const proofUrl = interaction.fields.getTextInputValue('proof_url');

        const adminChannel = interaction.guild.channels.cache.get(ADMIN_CHANNEL_ID);
        if (!adminChannel) {
            return interaction.reply({ content: '❌ Błąd konfiguracji! Nie znaleziono kanału admina.', ephemeral: true });
        }

        // Kalkulacja 50% i 60%
        let val50 = 'N/A';
        let val60 = 'N/A';
        const rawPrice = parseFloat(priceStr.replace(/\s+/g, '').replace('$', ''));
        if (!isNaN(rawPrice)) {
            val50 = Math.floor(rawPrice * 0.5).toLocaleString('pl-PL');
            val60 = Math.floor(rawPrice * 0.6).toLocaleString('pl-PL');
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 NOWE ZGŁOSZENIE SKUPU')
            .setColor('#FFD700')
            .addFields(
                { name: '👤 Sprzedający', value: `${interaction.user}\n\`${staticId}\``, inline: true },
                { name: '🏷️ Kategoria', value: category, inline: true },
                { name: '🎧 Przedmiot', value: `**${itemName}**`, inline: false },
                { name: '💰 Cena gracza', value: `**${priceStr}$**`, inline: true },
                { name: '📊 Sugerowane oferty', value: `50%: \`${val50}$\` | 60%: \`${val60}$\``, inline: false },
                { name: '🖼️ Dowód posiadania', value: `[Zobacz zdjęcie/screen](${proofUrl})`, inline: false }
            )
            .setImage(proofUrl)
            .setFooter({ text: `ID Użytkownika: ${interaction.user.id}` });

        const adminButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${interaction.user.id}_${encodeURIComponent(itemName)}_${encodeURIComponent(priceStr)}`)
                .setLabel('🟢 Akceptuj cenę')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`counter_${interaction.user.id}_${encodeURIComponent(itemName)}`)
                .setLabel('🟡 Kontroferta')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`reject_${interaction.user.id}_${encodeURIComponent(itemName)}`)
                .setLabel('🔴 Odrzuć')
                .setStyle(ButtonStyle.Danger)
        );

        await adminChannel.send({ embeds: [embed], components: [adminButtons] });
        await interaction.reply({ content: '✅ Twoje zgłoszenie zostało wysłane do weryfikacji!', ephemeral: true });
    }

    // 4. Akcje Admina w Konsoli (Akceptacja / Odrzucenie / Kontroferta)
    if (interaction.isButton()) {
        const [action, userId, rawItemName, rawPriceStr] = interaction.customId.split('_');
        const itemName = decodeURIComponent(rawItemName || '');
        const priceStr = decodeURIComponent(rawPriceStr || '');

        if (action === 'accept') {
            await createTicketChannel(interaction, userId, itemName, `${priceStr} $`, 'Zaakceptowano cenę gracza');
        } 
        else if (action === 'reject') {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                member.send(`❌ Twój przedmiot **${itemName}** został odrzucony przez skup.`).catch(() => {});
            }
            await interaction.reply({ content: `🔴 Odrzucono zgłoszenie przedmiotu: ${itemName}`, ephemeral: true });
        } 
        else if (action === 'counter') {
            const modal = new ModalBuilder()
                .setCustomId(`counter_modal_${userId}_${encodeURIComponent(itemName)}`)
                .setTitle('Złóż Kontrofertę');

            const newPriceInput = new TextInputBuilder()
                .setCustomId('new_price')
                .setLabel('Twoja propozycja ceny ($)')
                .setPlaceholder('np. 3500000')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(newPriceInput));
            await interaction.showModal(modal);
        }
    }

    // 5. Obsługa Modala Kontroferty
    if (interaction.isModalSubmit() && interaction.customId.startsWith('counter_modal_')) {
        const [, , userId, rawItemName] = interaction.customId.split('_');
        const itemName = decodeURIComponent(rawItemName);
        const newPrice = interaction.fields.getTextInputValue('new_price');

        await createTicketChannel(interaction, userId, itemName, `${newPrice} $`, 'Złożono nową kontrofertę przez Skup');
    }
});

// Funkcja pomocnicza do tworzenia kanału Ticket
async function createTicketChannel(interaction, userId, itemName, finalPrice, statusText) {
    const guild = interaction.guild;
    const userMember = await guild.members.fetch(userId).catch(() => null);

    const ticketChannel = await guild.channels.create({
        name: `transakcja-${userMember ? userMember.user.username : 'gracz'}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ...(userMember ? [{ id: userMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
        ]
    });

    const embed = new EmbedBuilder()
        .setTitle('🤝 OFERTA TRANSAKCJI SKUPU')
        .setDescription(`Witaj ${userMember ? userMember : 'Graczu'}!\nPrzedstawiamy finalną propozycję skupu.`)
        .setColor('#00FF00')
        .addFields(
            { name: '📦 Przedmiot', value: itemName, inline: false },
            { name: '💰 Proponowana Wypłata', value: `**${finalPrice}**`, inline: false },
            { name: 'ℹ️ Status', value: statusText, inline: false },
            { name: '📝 Wytyczne', value: 'Jeśli zgadzasz się na ofertę, odpisz na tym kanale i umów się z kupującym na odbiór w grze!', inline: false }
        );

    await ticketChannel.send({
        content: `${userMember ? userMember : ''} ${interaction.user}`,
        embeds: [embed]
    });

    await interaction.reply({ content: `✅ Utworzono kanał transakcyjny: ${ticketChannel}`, ephemeral: true });
}

// Logowanie do bota
client.login(process.env.DISCORD_TOKEN);