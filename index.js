const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  PermissionFlagsBits, 
  ChannelType,
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
const http = require('http');

// ==================== KONFIGURACJA KANAŁÓW I ROLI ====================
const PRIVATE_ADMIN_CHANNEL_ID = '1556289411422093362';
const PUBLIC_LOGS_CHANNEL_ID = '1556292054827536474';
const ADMIN_ROLE_ID = '1556293807019008160'; // ID roli zarządu skupu
// ====================================================================

let isSkupOpen = true;
const stats = {
  totalSpent: 0,
  totalItems: 0
};

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Skup MajesticRP v6 Tickets dziala!');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

process.on('unhandledRejection', (error) => {
  console.error('⚠ Wyłapano nieobsługiwany błąd (unhandledRejection):', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Wyłapano nieobsługiwany wyjątek (uncaughtException):', error);
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup_skup')
    .setDescription('Tworzy publiczny panel skupu przedmiotów MajesticRP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('skup_status')
    .setDescription('Otwiera lub zamyka przyjmowanie ofert skupu')
    .addStringOption(option => 
      option.setName('stan')
        .setDescription('Wybierz stan skupu')
        .setRequired(true)
        .addChoices(
          { name: '🟢 Otwarty', value: 'open' },
          { name: '🔴 Zamknięty', value: 'closed' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('statystyki')
    .setDescription('Wyświetla statystyki finansowe skupu')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

client.once('ready', async () => {
  console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Komendy slash zaktualizowane!');
  } catch (error) {
    console.error('❌ Błąd rejestracji komend:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Komendy Slash
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup_skup') {
        const embed = new EmbedBuilder()
          .setTitle('🏬 SKUP UNIKATÓW & MYTHICÓW — MAJESTIC RP')
          .setDescription(
            '**Szybka gotówka od ręki bez marnowania czasu na rynku!**\n\n' +
            'Chcesz szybko sprzedać rzadkie ubrania, unikatowe pojazdy lub akcesoria?\n' +
            'Złóż ofertę, a rozpatrzymy ją w kilka minut!\n\n' +
            '📌 **Zasady Skupu:**\n' +
            '• Skupujemy przedmioty za **50% – 70%** wartości rynkowej.\n' +
            '• Nie skupujemy zwykłych ubrań ze sklepów ani podstawowych aut.\n' +
            '• W przypadku wstępnego zainteresowania otworzy się prywatny ticket do rozmowy!'
          )
          .setColor(0x2b2d31)
          .setFooter({ text: 'Kliknij przycisk poniżej, aby wysłać zgłoszenie.' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('start_sell')
            .setLabel('💰 Sprzedaj Przedmiot (Złóż Ofertę)')
            .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
      }

      if (interaction.commandName === 'skup_status') {
        const status = interaction.options.getString('stan');
        isSkupOpen = (status === 'open');
        await interaction.reply({ 
          content: `⚙️ Status skupu został zmieniony na: **${isSkupOpen ? '🟢 OTWARTY' : '🔴 ZAMKNIĘTY'}**`, 
          ephemeral: true 
        });
      }

      if (interaction.commandName === 'statystyki') {
        const statsEmbed = new EmbedBuilder()
          .setTitle('📊 STATYSTYKI FINANSOWE SKUPU')
          .setColor(0xf1c40f)
          .addFields(
            { name: '💰 Łącznie wydano na skupie', value: `$${stats.totalSpent.toLocaleString()}`, inline: true },
            { name: '📦 Kupione przedmioty', value: `${stats.totalItems} szt.`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
      }
    }

    // 2. Otwieranie Formularza
    if (interaction.isButton() && interaction.customId === 'start_sell') {
      if (!isSkupOpen) {
        return await interaction.reply({
          content: '🔴 **Skup jest obecnie ZAMKNIĘTY.** Spróbuj ponownie później!',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('sell_modal')
        .setTitle('Formularz Sprzedaży Przedmiotu');

      const itemNameInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('Nazwa przedmiotu')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. Słuchawki Apple V2')
        .setRequired(true);

      const marketValueInput = new TextInputBuilder()
        .setCustomId('market_value')
        .setLabel('Szacowana wartość rynkowa ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. 19000000')
        .setRequired(true);

      const expectedPriceInput = new TextInputBuilder()
        .setCustomId('expected_price')
        .setLabel('Ile Ty za to chcesz? ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. 12000000')
        .setRequired(true);

      const wikiLinkInput = new TextInputBuilder()
        .setCustomId('wiki_link')
        .setLabel('Link do Majestic Wiki (Opcjonalnie)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://wiki.majestic-rp.ru/...')
        .setRequired(false);

      const proofInput = new TextInputBuilder()
        .setCustomId('proof_link')
        .setLabel('Link do Zdjęcia (Ctrl+V Imgur/Discord)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://i.imgur.com/...')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(itemNameInput),
        new ActionRowBuilder().addComponents(marketValueInput),
        new ActionRowBuilder().addComponents(expectedPriceInput),
        new ActionRowBuilder().addComponents(wikiLinkInput),
        new ActionRowBuilder().addComponents(proofInput)
      );

      await interaction.showModal(modal);
    }

    // 3. Wysyłanie Oferty
    if (interaction.isModalSubmit() && interaction.customId === 'sell_modal') {
      const itemName = interaction.fields.getTextInputValue('item_name');
      const marketValueRaw = interaction.fields.getTextInputValue('market_value').replace(/[^0-9]/g, '');
      const expectedPriceRaw = interaction.fields.getTextInputValue('expected_price').replace(/[^0-9]/g, '');
      const wikiLink = interaction.fields.getTextInputValue('wiki_link') || 'Brak linku do Wiki';
      const proofLink = interaction.fields.getTextInputValue('proof_link') || 'Brak wklejonego linku';

      const marketValue = parseInt(marketValueRaw) || 0;
      const expectedPrice = parseInt(expectedPriceRaw) || 0;

      const minBuy = Math.round(marketValue * 0.5);
      const maxBuy = Math.round(marketValue * 0.7);

      const offerEmbed = new EmbedBuilder()
        .setTitle(`📥 NOWA OFERTA: ${itemName}`)
        .setColor(0x3498db)
        .addFields(
          { name: '👤 Sprzedający', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
          { name: '🆔 ID Discord', value: `\`${interaction.user.id}\``, inline: true },
          { name: '📦 Przedmiot', value: itemName, inline: false },
          { name: '💎 Rynkowa Wartość', value: `$${marketValue.toLocaleString()}`, inline: true },
          { name: '💵 Chce dostać', value: `$${expectedPrice.toLocaleString()}`, inline: true },
          { name: '📊 Sugerowany Skup (50%-70%)', value: `\`$${minBuy.toLocaleString()} - $${maxBuy.toLocaleString()}\``, inline: false },
          { name: '🌐 Majestic Wiki', value: wikiLink !== 'Brak linku do Wiki' ? `[Kliknij, aby otworzyć Wiki](${wikiLink})` : 'Nie podano', inline: true },
          { name: '🖼️ Dowód / Screen', value: proofLink, inline: false }
        )
        .setFooter({ text: 'System Skupu • Wybierz decyzję poniżej' })
        .setTimestamp();

      const safeItemName = itemName.replace(/\s+/g, '-');

      const adminButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${interaction.user.id}_${safeItemName}_${expectedPrice}`)
          .setLabel('✅ Akceptuj & Otwórz Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`counter_${interaction.user.id}_${safeItemName}`)
          .setLabel('💬 Kontroferta & Otwórz Ticket')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`reject_${interaction.user.id}_${safeItemName}`)
          .setLabel('❌ Odrzuć')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ 
        content: '✅ Twoja oferta została pomyślnie wysłana! Jeśli zarząd będzie zainteresowany, otworzy się prywatny ticket do omówienia szczegółów.', 
        ephemeral: true 
      });

      try {
        const privateChannel = await client.channels.fetch(PRIVATE_ADMIN_CHANNEL_ID);
        if (privateChannel) {
          await privateChannel.send({
            content: `🔔 **Nowa oferta od gracza ${interaction.user}!**`,
            embeds: [offerEmbed],
            components: [adminButtons]
          });
        }
      } catch (err) {
        console.error('Błąd wysyłania na prywatny kanał:', err);
      }
    }

    // 4. Akcje Zarządu (Tworzenie Ticketu)
    if (interaction.isButton()) {
      const parts = interaction.customId.split('_');
      const action = parts[0];

      // TICKET - Akceptacja
      if (action === 'accept') {
        const userId = parts[1];
        const rawItemName = parts[2] ? parts[2].replace(/-/g, ' ') : 'Przedmiot';
        const price = parseInt(parts[3]) || 0;

        const guild = interaction.guild;
        const user = await client.users.fetch(userId);

        // Tworzenie prywatnego kanału ticketowego
        const ticketChannel = await guild.channels.create({
          name: `skup-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Ukryte dla reszty
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // Widoczne dla gracza
            { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] } // Widoczne dla Zarządu
          ]
        });

        const ticketEmbed = new EmbedBuilder()
          .setTitle('🤝 TICKET TRANSAKCYJNY SKUPU')
          .setColor(0x2ecc71)
          .setDescription(
            `Witaj <@${userId}>! Twój przedmiot **${rawItemName}** został wstępnie zaakceptowany za kwotę **$${price.toLocaleString()}**.\n\n` +
            `Omówcie tutaj godziny spotkania w grze i przekazania przedmiotu.`
          )
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`closeticket_${userId}_${parts[2]}_${price}`)
            .setLabel('🔒 Sfinalizuj & Zamknij Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `🔔 Oferta zaakceptowana! <@${userId}> <@&${ADMIN_ROLE_ID}>`, embeds: [ticketEmbed], components: [closeRow] });
        await interaction.reply({ content: `✅ UTWORZONO TICKET: ${ticketChannel}`, ephemeral: true });
      }

      // TICKET - Kontroferta
      if (action === 'counter') {
        const userId = parts[1];
        const safeItemName = parts[2] || 'Przedmiot';

        const modal = new ModalBuilder()
          .setCustomId(`submit_counter_${userId}_${safeItemName}`)
          .setTitle('Zaproponuj Własną Cenę');

        const counterPriceInput = new TextInputBuilder()
          .setCustomId('counter_price')
          .setLabel('Twoja Propozycja Kwoty ($)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. 10000000')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(counterPriceInput));
        await interaction.showModal(modal);
      }

      // Odrzucenie
      if (action === 'reject') {
        const userId = parts[1];
        const rawItemName = parts[2] ? parts[2].replace(/-/g, ' ') : 'Przedmiot';

        try {
          const user = await client.users.fetch(userId);
          await user.send(`❌ **Twoja oferta na przedmiot "${rawItemName}" została odrzucona.**`);
          await interaction.reply({ content: `❌ Odrzucono ofertę gracza <@${userId}>.`, ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `⚠️ Odrzucono ofertę, ale gracz ma zablokowane PW.`, ephemeral: true });
        }
      }

      // Zamknięcie i sfinalizowanie Ticketu
      if (action === 'closeticket') {
        const userId = parts[1];
        const rawItemName = parts[2] ? parts[2].replace(/-/g, ' ') : 'Przedmiot';
        const price = parseInt(parts[3]) || 0;

        stats.totalSpent += price;
        stats.totalItems += 1;

        // Logowanie na publicznym kanale
        try {
          const publicLogsChannel = await client.channels.fetch(PUBLIC_LOGS_CHANNEL_ID);
          if (publicLogsChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('🤝 ZREALIZOWANA TRANSAKCJA SKUPU')
              .setColor(0x2ecc71)
              .addFields(
                { name: '📦 Wykupiony Przedmiot', value: rawItemName, inline: true },
                { name: '💰 Wypłacona Gotówka', value: `$${price.toLocaleString()}`, inline: true },
                { name: '👤 Sprzedający', value: `<@${userId}>`, inline: true }
              )
              .setFooter({ text: 'Szybka wypłata od ręki • Dołącz do naszych zadowolonych klientów!' })
              .setTimestamp();

            await publicLogsChannel.send({ embeds: [logEmbed] });
          }
        } catch (e) {
          console.error('Błąd publikacji logu transakcji:', e);
        }

        // Wiadomość na PW z prośbą o opinię
        try {
          const user = await client.users.fetch(userId);
          const vouchRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('write_vouch')
              .setLabel('⭐ Wystaw Opinię (Vouch)')
              .setStyle(ButtonStyle.Secondary)
          );

          await user.send({
            content: `🎉 **Dziękujemy za transakcję w naszym skupie!**\nSfinalizowano kupno przedmiotu: **${rawItemName}** za **$${price.toLocaleString()}**.\n\nZostaw opinię klikając przycisk poniżej:`,
            components: [vouchRow]
          });
        } catch (e) {}

        await interaction.reply('🔒 Sfinalizowano! Zamykanie i usuwanie ticketu za 5 sekund...');
        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 5000);
      }

      if (interaction.customId === 'write_vouch') {
        const modal = new ModalBuilder()
          .setCustomId('submit_vouch_modal')
          .setTitle('Zostaw Opinię o Skupie');

        const commentInput = new TextInputBuilder()
          .setCustomId('vouch_comment')
          .setLabel('Napisz krótką opinię')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('np. Polecam skup, szybka wypłata 10/10!')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
        await interaction.showModal(modal);
      }
    }

    // Modal Kontroferty (Otwiera ticket z nową propozycją ceny)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('submit_counter_')) {
      const parts = interaction.customId.split('_');
      const userId = parts[2];
      const safeItemName = parts[3] || 'Przedmiot';
      const rawItemName = safeItemName.replace(/-/g, ' ');

      const counterPriceRaw = interaction.fields.getTextInputValue('counter_price').replace(/[^0-9]/g, '');
      const counterPrice = parseInt(counterPriceRaw) || 0;

      const guild = interaction.guild;
      const user = await client.users.fetch(userId);

      const ticketChannel = await guild.channels.create({
        name: `kontroferta-${user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle('💬 KONTROFERTA ZARZĄDU SKUPU')
        .setColor(0x3498db)
        .setDescription(
          `Witaj <@${userId}>! Przeanalizowaliśmy Twoją ofertę na **${rawItemName}**.\n\n` +
          `💰 **Nasza propozycja ceny skupu:** **$${counterPrice.toLocaleString()}**\n\n` +
          `Napisz na tym kanale, czy zgadzasz się na taką kwotę!`
        )
        .setTimestamp();

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`closeticket_${userId}_${safeItemName}_${counterPrice}`)
          .setLabel('🔒 Sfinalizuj & Zamknij Ticket')
          .setStyle(ButtonStyle.Success)
      );

      await ticketChannel.send({ content: `🔔 Otrzymałeś kontrofertę! <@${userId}> <@&${ADMIN_ROLE_ID}>`, embeds: [ticketEmbed], components: [closeRow] });
      await interaction.reply({ content: `💬 Utworzono ticket z kontrofertą: ${ticketChannel}`, ephemeral: true });
    }

    // Modal Wystawiania Opinii
    if (interaction.isModalSubmit() && interaction.customId === 'submit_vouch_modal') {
      const comment = interaction.fields.getTextInputValue('vouch_comment');

      try {
        const publicLogsChannel = await client.channels.fetch(PUBLIC_LOGS_CHANNEL_ID);
        if (publicLogsChannel) {
          const vouchEmbed = new EmbedBuilder()
            .setTitle('⭐ NOWA OPINIA KLIENTA')
            .setColor(0xf1c40f)
            .setDescription(`*"${comment}"*`)
            .addFields({ name: '👤 Klient', value: `${interaction.user}`, inline: true })
            .setTimestamp();

          await publicLogsChannel.send({ embeds: [vouchEmbed] });
        }
        await interaction.reply({ content: `❤️ Dziękujemy za wystawienie opinii!`, ephemeral: true });
      } catch (e) {
        console.error('Błąd publikacji opinii:', e);
      }
    }
  } catch (err) {
    console.error('Błąd podczas obsługi interakcji:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
