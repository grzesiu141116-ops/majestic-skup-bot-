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
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
const http = require('http');

// ==================== KONFIGURACJA KANAŁÓW ====================
const PRIVATE_ADMIN_CHANNEL_ID = '1556289411422093362';
const PUBLIC_LOGS_CHANNEL_ID = '1556292054827536474';
// =============================================================

// Baza danych w pamięci bota
let isSkupOpen = true;
const stats = {
  totalSpent: 0,
  totalItems: 0
};

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Skup MajesticRP v4 Ultra dziala!');
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

// Rejestracja komend slash
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
    // 1. Komendy Admina (/setup_skup, /skup_status, /statystyki)
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
            '• Odpowiedź z decyzją lub kontrofertą otrzymasz na PW od bota!'
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

    // 2. Kliknięcie "Sprzedaj Przedmiot"
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

    // 3. Obsługa Wysyłania Formularza
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
          { name: '🆔 ID Discord Gracza', value: `\`${interaction.user.id}\``, inline: true },
          { name: '📦 Przedmiot', value: itemName, inline: false },
          { name: '💎 Rynkowa Wartość', value: `$${marketValue.toLocaleString()}`, inline: true },
          { name: '💵 Chce dostać', value: `$${expectedPrice.toLocaleString()}`, inline: true },
          { name: '📊 Sugerowany Skup (50%-70%)', value: `\`$${minBuy.toLocaleString()} - $${maxBuy.toLocaleString()}\``, inline: false },
          { name: '🌐 Majestic Wiki', value: wikiLink !== 'Brak linku do Wiki' ? `[Kliknij, aby otworzyć Wiki](${wikiLink})` : 'Nie podano', inline: true },
          { name: '🖼️ Dowód / Screen', value: proofLink, inline: false }
        )
        .setFooter({ text: 'System Skupu • Wybierz decyzję poniżej' })
        .setTimestamp();

      const adminButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${interaction.user.id}_${itemName}_${expectedPrice}`)
          .setLabel('✅ Akceptuj')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`counter_${interaction.user.id}_${itemName}`)
          .setLabel('💬 Zaproponuj Cenę')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`reject_${interaction.user.id}_${itemName}`)
          .setLabel('❌ Odrzuć')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ 
        content: '✅ Twoja oferta została wysłana! Otrzymasz wiadomość na PW (od bota), gdy zostanie przeanalizowana.', 
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

    // 4. Obsługa Przycisków Akcji przez Zarząd
    if (interaction.isButton()) {
      const [action, userId, ...rest] = interaction.customId.split('_');

      if (action === 'accept') {
        const itemName = rest[0];
        const price = parseInt(rest[1]) || 0;

        // Aktualizacja statystyk
        stats.totalSpent += price;
        stats.totalItems += 1;

        try {
          const user = await client.users.fetch(userId);
          
          const vouchRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('write_vouch')
              .setLabel('⭐ Wystaw Opinię (Vouch)')
              .setStyle(ButtonStyle.Secondary)
          );

          await user.send({
            content: `🎉 **Twoja oferta została AKCEPTOWANA!**\n\n` +
            `📦 **Przedmiot:** ${itemName}\n` +
            `💵 **Kwota:** $${price.toLocaleString()}\n\n` +
            `Skontaktuj się z właścicielem skupu w grze/na Discordzie, aby sfinalizować transakcję!`,
            components: [vouchRow]
          });

          // Wpis na publiczny kanał zrealizowanych transakcji
          try {
            const publicLogsChannel = await client.channels.fetch(PUBLIC_LOGS_CHANNEL_ID);
            if (publicLogsChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('🤝 ZREALIZOWANA TRANSAKCJA SKUPU')
                .setColor(0x2ecc71)
                .addFields(
                  { name: '📦 Wykupiony Przedmiot', value: itemName, inline: true },
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

          await interaction.reply({ content: `✅ Zaakceptowano ofertę gracza <@${userId}>. Dodano do statystyk i opublikowano log!`, ephemeral: false });
        } catch (err) {
          await interaction.reply({ content: `⚠️️ Zaakceptowano, ale gracz ma zablokowane PW!`, ephemeral: false });
        }
      }

      if (action === 'counter') {
        const itemName = rest[0];

        const modal = new ModalBuilder()
          .setCustomId(`submit_counter_${userId}_${itemName}`)
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

      if (action === 'reject') {
        const itemName = rest[0];

        try {
          const user = await client.users.fetch(userId);
          await user.send(
            `❌ **Twoja oferta została ODRZUCONA.**\n\n` +
            `📦 **Przedmiot:** ${itemName}\n` +
            `Aktualnie nie jesteśmy zainteresowani zakupem tego przedmiotu w podanej cenie.`
          );

          await interaction.reply({ content: `❌ Odrzucono ofertę gracza <@${userId}>. Bot wysłał PW!`, ephemeral: false });
        } catch (err) {
          await interaction.reply({ content: `⚠️ Odrzucono ofertę, ale gracz ma zablokowane PW!`, ephemeral: false });
        }
      }

      // Przycisk "Wystaw Opinię" dla gracza
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

    // 5. Wysyłanie Kontroferty
    if (interaction.isModalSubmit() && interaction.customId.startsWith('submit_counter_')) {
      const [, , userId, itemName] = interaction.customId.split('_');
      const counterPriceRaw = interaction.fields.getTextInputValue('counter_price').replace(/[^0-9]/g, '');
      const counterPrice = parseInt(counterPriceRaw) || 0;

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `💬 **Właściciel skupu złożył KONTROFERTĘ!**\n\n` +
          `📦 **Przedmiot:** ${itemName}\n` +
          `💵 **Proponowana cena skupu:** $${counterPrice.toLocaleString()}\n\n` +
          `Jeśli zgadzasz się na tę kwotę, napisz w odpowiedzi na to PW lub skontaktuj się bezpośrednio z właścicielem skupu!`
        );

        await interaction.reply({ content: `💬 Wysyłano kontrofertę ($${counterPrice.toLocaleString()}) do gracza <@${userId}> na PW!`, ephemeral: false });
      } catch (err) {
        await interaction.reply({ content: `⚠️ Nie udało się wysłać kontroferty (gracz zablokował PW).`, ephemeral: false });
      }
    }

    // 6. Wysyłanie Opinii przez Gracza
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
