(function ($) {
    "use strict";

    /* ==================================================
        Tracking: klik elemen ber-atribut data-track dikirim ke dataLayer (GTM).
        Contoh: <a data-track="contact_whatsapp" data-track-location="header">
        -> { event: "contact_whatsapp", location: "header" }
    ================================================== */
    $(document).on('click', '[data-track]', function () {
        const params = {};
        $.each(this.dataset, function (key, value) {
            if (key === 'track' || key.indexOf('track') !== 0) return;
            // trackSuggestionText -> suggestion_text
            const name = key.slice(5).replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
            params[name] = value;
        });
        trackEvent(this.dataset.track, params);
    });

    /* ==================================================
        Form kontak -> WhatsApp
    ================================================== */
    $('.wa-form:not(.reg-form)').on('submit', function (e) {
        e.preventDefault();

        const form = $(this);
        const msg = form.find('.wa-form-msg');
        const val = (name) => $.trim(form.find('[name="' + name + '"]').val() || '');

        if (!val('nama') || !val('kebutuhan')) {
            msg.removeClass('success').text('Mohon isi nama dan pilih kebutuhan Anda.');
            return;
        }

        const lines = [
            'Halo Tekoala, saya ' + val('nama') + (val('instansi') ? ' dari ' + val('instansi') : '') + '.',
            'Saya tertarik dengan: ' + val('kebutuhan') + '.'
        ];
        if (val('pesan')) lines.push('', val('pesan'));
        if (val('email')) lines.push('', 'Email: ' + val('email'));

        trackEvent('contact_form_submit', { interest: val('kebutuhan') });

        msg.addClass('success').text('Membuka WhatsApp...');
        window.open('https://wa.me/' + form.data('phone') + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
    });

    /* ==================================================
        Form Registrasi Event & Kelas -> Google Sheets
        - Mode Gratis (10 field + multiple input social media)
        - Mode Berbayar (4 field inti)
        - Proteksi: Honeypot, timing anti-bot, rate-limit,
          & sanitasi Formula Injection Google Sheets
    ================================================== */
    $('.reg-form').each(function () {
        const form = $(this);
        const select = form.find('[data-reg-select]');
        const msg = form.find('[data-reg-msg]');
        const submitBtn = form.find('[data-reg-submit]');
        const submitText = form.find('[data-reg-submit-text]');
        const socmedList = form.find('[data-socmed-list]');
        const socmedAdd = form.find('[data-socmed-add]');
        const successBox = $('[data-reg-success]');
        const modePill = $('[data-reg-mode-pill]');
        const badge = $('[data-reg-badge]');
        const loadedAt = Date.now();
        const MAX_SOCMED = 5;

        // Sanitasi teks & cegah Formula Injection di Google Sheets (=, +, -, @)
        function sanitizeCell(value, maxLen) {
            let s = String(value || '')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
                .trim();
            if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return s;
        }

        function isPaidSelected() {
            const opt = select.find('option:selected');
            return String(opt.data('paid')) === 'true';
        }

        function syncMode() {
            const opt = select.find('option:selected');
            const paid = isPaidSelected();

            // Update kartu ringkasan di kolom kiri
            badge
                .toggleClass('is-paid', paid)
                .toggleClass('is-free', !paid)
                .text(paid ? 'Kelas Berbayar' : 'Kelas Gratis');
            $('[data-reg-kind]').text(opt.data('kind') || '-');
            $('[data-reg-title]').text(opt.data('title') || '-');
            $('[data-reg-schedule]').text(opt.data('schedule') || '-');
            $('[data-reg-speaker]').text(opt.data('speaker') || '-');
            $('[data-reg-format]').text(opt.data('format') || '-');
            $('[data-reg-price]').text(opt.data('price') || (paid ? 'Berbayar' : 'Gratis'));

            // Update pill indikator mode formulir
            modePill
                .toggleClass('is-paid', paid)
                .toggleClass('is-free', !paid)
                .html(
                    paid
                        ? '<i class="fas fa-credit-card"></i> Formulir Kelas Berbayar'
                        : '<i class="fas fa-check-circle"></i> Formulir Kelas Gratis'
                );

            // Cek apakah event sudah selesai (past event)
            const endVal = opt.data('end');
            const isEnded = endVal && Date.now() > Date.parse(endVal);

            if (isEnded) {
                modePill
                    .removeClass('is-paid is-free')
                    .addClass('is-ended')
                    .html('<i class="fas fa-lock"></i> Pendaftaran Sudah Ditutup');
                badge
                    .removeClass('is-paid is-free')
                    .addClass('is-ended')
                    .text('Event Selesai');
                submitBtn.prop('disabled', true);
                submitText.text('Pendaftaran Ditutup');
                msg.addClass('ended-notice').text('Event ini telah selesai diselenggarakan. Pendaftaran peserta baru sudah ditutup.');
            } else {
                modePill.removeClass('is-ended');
                badge.removeClass('is-ended');
                submitBtn.prop('disabled', false);
                submitText.text('Daftar Sekarang');
                msg.removeClass('ended-notice').text('');
            }

            // Sembunyikan/tampilkan field khusus Kelas Gratis
            form.find('[data-free-only]').prop('hidden', paid);
            form.find('[data-free-required]').prop('required', !paid && !isEnded);

            const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
            if (smoother) setTimeout(() => smoother.refresh(), 50);
        }

        // Multiple input Social Media
        function updateSocmedButtons() {
            const rows = socmedList.find('[data-socmed-row]');
            rows.each(function (idx) {
                $(this).find('[data-socmed-remove]').prop('hidden', rows.length <= 1);
                $(this).find('.reg-socmed-input').prop('required', idx === 0 && !isPaidSelected());
            });
            socmedAdd.prop('hidden', rows.length >= MAX_SOCMED);
        }

        socmedAdd.on('click', function () {
            const rows = socmedList.find('[data-socmed-row]');
            if (rows.length >= MAX_SOCMED) return;
            const clone = rows.first().clone();
            clone.find('.reg-socmed-input').val('').prop('required', false);
            socmedList.append(clone);
            updateSocmedButtons();
            const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
            if (smoother) smoother.refresh();
        });

        socmedList.on('click', '[data-socmed-remove]', function () {
            if (socmedList.find('[data-socmed-row]').length <= 1) return;
            $(this).closest('[data-socmed-row]').remove();
            updateSocmedButtons();
            const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
            if (smoother) smoother.refresh();
        });

        // Pilih otomatis dari query URL: ?item=... atau ?event=... atau ?kelas=...
        const params = new URLSearchParams(window.location.search);
        const requestedSlug = params.get('item') || params.get('event') || params.get('kelas');
        if (requestedSlug && select.find('option[value="' + CSS.escape(requestedSlug) + '"]').length) {
            select.val(requestedSlug);
        }
        select.on('change', function () {
            msg.text('').removeClass('success');
            syncMode();
            updateSocmedButtons();
        });

        syncMode();
        updateSocmedButtons();

        // Reset untuk daftar kelas lainnya
        $('[data-reg-reset]').on('click', function () {
            form[0].reset();
            socmedList.find('[data-socmed-row]:gt(0)').remove();
            successBox.prop('hidden', true);
            form.prop('hidden', false);
            msg.text('').removeClass('success');
            syncMode();
            updateSocmedButtons();
        });

        form.on('submit', async function (e) {
            e.preventDefault();
            msg.removeClass('success').text('');

            // Tolak jika event sudah selesai
            const optCurrent = select.find('option:selected');
            const endCurrent = optCurrent.data('end');
            if (endCurrent && Date.now() > Date.parse(endCurrent)) {
                msg.addClass('ended-notice').text('Maaf, event ini sudah selesai. Pendaftaran sudah ditutup.');
                return;
            }

            // 1. Proteksi Honeypot anti-bot
            if ($.trim(form.find('[name="website_url"]').val() || '') !== '') {
                return;
            }

            // 2. Proteksi waktu pengisian minimum (anti auto-submit bot)
            if (Date.now() - loadedAt < 2000) {
                msg.text('Mohon periksa kembali data Anda sebelum mengirim.');
                return;
            }

            // 3. Proteksi Cooldown / Rate-limit (15 detik antar pengiriman)
            try {
                const lastSubmit = parseInt(sessionStorage.getItem('tkl_reg_ts') || '0', 10);
                if (Date.now() - lastSubmit < 15000) {
                    msg.text('Pendaftaran Anda baru saja dikirim. Mohon tunggu beberapa detik.');
                    return;
                }
            } catch (err) {}

            const opt = select.find('option:selected');
            const paid = isPaidSelected();
            const getVal = (name, max) => sanitizeCell(form.find('[name="' + name + '"]').val(), max);

            const nama = getVal('nama', 120);
            const email = getVal('email', 120);
            const rawWa = String(form.find('[name="no_wa"]').val() || '').replace(/[\s\-().]/g, '');
            const noWa = sanitizeCell(rawWa, 20);
            const alamat = getVal('alamat', 350);

            if (!nama || nama.length < 2) {
                msg.text('Mohon isi nama lengkap Anda.');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                msg.text('Mohon masukkan alamat email yang valid.');
                return;
            }
            if (!/^(\+?62|0)8[0-9]{7,13}$/.test(rawWa)) {
                msg.text('Mohon masukkan nomor WhatsApp aktif yang valid (contoh: 081234567890).');
                return;
            }
            if (!alamat || alamat.length < 5) {
                msg.text('Mohon isi alamat domisili lengkap Anda.');
                return;
            }

            let ttl = '';
            let socialMedia = '';
            let pendidikan = '';
            let pekerjaan = '';
            let jabatan = '';
            let perusahaan = '';

            if (!paid) {
                const tempatLahir = getVal('tempat_lahir', 80);
                const tanggalLahir = String(form.find('[name="tanggal_lahir"]').val() || '').trim();
                if (!tempatLahir || !tanggalLahir) {
                    msg.text('Mohon lengkapi Tempat dan Tanggal Lahir Anda.');
                    return;
                }
                const parts = tanggalLahir.split('-');
                const formattedDate = parts.length === 3 ? parts[2] + '-' + parts[1] + '-' + parts[0] : tanggalLahir;
                ttl = sanitizeCell(tempatLahir + ', ' + formattedDate, 120);

                const socmedEntries = [];
                let invalidSocmed = false;
                socmedList.find('[data-socmed-row]').each(function () {
                    const platform = sanitizeCell($(this).find('.reg-socmed-platform').val(), 30);
                    const urlVal = $.trim($(this).find('.reg-socmed-input').val() || '');
                    if (!urlVal) return;
                    if (urlVal.length < 2 || /\s/.test(urlVal)) {
                        invalidSocmed = true;
                        return;
                    }
                    socmedEntries.push(platform + ': ' + sanitizeCell(urlVal, 200));
                });

                if (invalidSocmed || !socmedEntries.length) {
                    msg.text('Mohon isi minimal 1 URL atau username Social Media tanpa spasi.');
                    return;
                }
                socialMedia = sanitizeCell(socmedEntries.join(' | '), 1000);

                pendidikan = getVal('pendidikan', 60);
                pekerjaan = getVal('pekerjaan', 80);
                jabatan = getVal('jabatan', 100);
                perusahaan = getVal('perusahaan', 120);

                if (!pendidikan || !pekerjaan || !jabatan || !perusahaan) {
                    msg.text('Mohon lengkapi Pendidikan Terakhir, Pekerjaan, Jabatan, dan Perusahaan/Instansi.');
                    return;
                }
            }

            const payload = {
                token: String(form.data('token') || ''),
                timestamp: new Date().toISOString(),
                formType: paid ? 'paid' : 'free',
                statusLabel: paid ? 'Berbayar' : 'Gratis',
                itemSlug: sanitizeCell(select.val(), 120),
                itemTitle: sanitizeCell(opt.data('title'), 160),
                itemKind: sanitizeCell(opt.data('kind'), 80),
                itemPrice: sanitizeCell(opt.data('price'), 60),
                nama,
                email,
                noWa,
                alamat,
                ttl,
                socialMedia,
                pendidikan,
                pekerjaan,
                jabatan,
                perusahaan
            };

            const waLines = [
                'Halo Tekoala, saya telah mengisi formulir pendaftaran:',
                '• Kegiatan: ' + payload.itemTitle + ' (' + payload.statusLabel + ')',
                '• Nama: ' + nama,
                '• Email: ' + email,
                '• No. WA: ' + rawWa
            ];
            if (!paid) {
                waLines.push('• Instansi/Kampus: ' + perusahaan + ' (' + jabatan + ')');
            } else {
                waLines.push('', 'Mohon info langkah selanjutnya untuk pendaftaran kelas ini.');
            }
            const waUrl = 'https://wa.me/' + form.data('phone') + '?text=' + encodeURIComponent(waLines.join('\n'));
            $('[data-reg-wa-btn]').attr('href', waUrl);

            const endpoint = $.trim(form.data('endpoint') || '');
            submitBtn.prop('disabled', true);
            submitText.text('Menyimpan pendaftaran...');

            try {
                if (endpoint) {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        mode: 'cors',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json().catch(() => ({ ok: true }));
                    if (data && data.ok === false) {
                        throw new Error(data.error || 'Gagal menyimpan data.');
                    }
                }

                try { sessionStorage.setItem('tkl_reg_ts', String(Date.now())); } catch (err) {}
                trackEvent('event_register_submit', {
                    item_title: payload.itemTitle,
                    form_type: payload.formType
                });

                form.prop('hidden', true);
                $('[data-reg-success-title]').text('Pendaftaran ' + payload.itemTitle + ' Berhasil!');
                $('[data-reg-success-desc]').text(
                    endpoint
                        ? 'Data Anda sudah tercatat di sistem Tekoala. Silakan klik tombol di bawah jika ingin konfirmasi langsung via WhatsApp.'
                        : 'Data Anda telah disiapkan. Klik tombol di bawah untuk mengirim konfirmasi pendaftaran ke WhatsApp Admin.'
                );
                successBox.prop('hidden', false);

                const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
                if (smoother) smoother.refresh();
            } catch (err) {
                msg.text('Terjadi kendala jaringan saat menyimpan. Silakan coba lagi atau hubungi WhatsApp kami.');
            } finally {
                submitBtn.prop('disabled', false);
                submitText.text('Daftar Sekarang');
            }
        });
    });

    /* ==================================================
        Event: hitung mundur, status, dan sembunyikan otomatis setelah selesai
    ================================================== */
    const eventEls = $('[data-event-end]');
    if (eventEls.length) {
        const pad = (n) => String(n).padStart(2, '0');
        const dismissed = (key) => { try { return sessionStorage.getItem('event-notice:' + key) === '1'; } catch (e) { return false; } };

        function updateEvents() {
            const now = Date.now();
            eventEls.each(function () {
                const el = $(this);
                const start = Date.parse(el.data('event-start'));
                const end = Date.parse(el.data('event-end'));
                const live = now >= start && now <= end;

                // Jika event di Hero selesai, ganti dengan mentor fallback
                if (el.hasClass('hero-event')) {
                    if (now > end) {
                        el.remove();
                        $('[data-event-fallback]').prop('hidden', false);
                        const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
                        if (smoother) smoother.refresh();
                        return;
                    }
                }

                const isEnded = now > end;
                el.toggleClass('is-ended', isEnded);
                el.toggleClass('is-live', !isEnded && live);

                const status = el.find('[data-event-status]');
                if (isEnded) {
                    status.text('Selesai');
                } else if (live) {
                    status.text('Sedang berlangsung');
                } else {
                    status.text(status.data('label'));
                }

                // Update tombol aksi di event card
                const actionBtn = el.find('[data-event-action-btn]');
                if (actionBtn.length) {
                    if (isEnded) {
                        actionBtn
                            .addClass('disabled is-ended')
                            .removeAttr('href')
                            .attr('aria-disabled', 'true');
                        actionBtn.find('[data-btn-text]').text('Pendaftaran Ditutup');
                        actionBtn.find('i').attr('class', 'fas fa-lock');
                    } else {
                        actionBtn
                            .removeClass('disabled is-ended')
                            .removeAttr('aria-disabled');
                    }
                }

                const cd = el.find('[data-countdown]');
                if (cd.length) {
                    let diff = Math.max(0, Math.floor((start - now) / 1000));
                    const values = {
                        d: pad(Math.floor(diff / 86400)),
                        h: pad(Math.floor((diff % 86400) / 3600)),
                        m: pad(Math.floor((diff % 3600) / 60)),
                        s: pad(diff % 60),
                    };
                    $.each(values, function (unit, value) {
                        const box = cd.find('[data-cd="' + unit + '"]');
                        if (box.text() === value) return;
                        box.text(value);
                        // animasi angka berganti
                        box.removeClass('tick');
                        void box[0].offsetWidth;
                        box.addClass('tick');
                    });
                    cd.toggle(!live);
                }
            });
            // highlight hanya event mendatang terdekat (bukan yang sudah selesai)
            $('.event-card').removeClass('is-next');
            $('.event-card:not(.is-ended)').first().addClass('is-next');
        }

        // simpan label asli (mis. "Event Minggu ini", "Segera") sebelum status diubah
        $('[data-event-status]').each(function () { $(this).data('label', $(this).text()); });

        $('.event-notice').each(function () {
            const el = $(this);
            if (!dismissed(el.data('event-notice')) && Date.now() <= Date.parse(el.data('event-end'))) {
                setTimeout(() => el.prop('hidden', false).addClass('show'), 1500);
            }
        });
        $(document).on('click', '[data-event-notice-close]', function () {
            const el = $(this).closest('.event-notice');
            el.removeClass('show').prop('hidden', true);
            try { sessionStorage.setItem('event-notice:' + el.data('event-notice'), '1'); } catch (e) {}
        });

        updateEvents();
        setInterval(updateEvents, 1000);
    }

    /* ==================================================
        Filter daftar kelas (halaman Program Pelatihan)
    ================================================== */
    $('[data-portfolio-filter]').each(function () {
        const wrap = $(this);
        wrap.find('[data-filter]').on('click', function () {
            const key = $(this).data('filter');
            wrap.find('[data-filter]').removeClass('active');
            $(this).addClass('active');
            wrap.find('.portfolio-list [data-category]').each(function () {
                $(this).prop('hidden', key !== 'all' && $(this).data('category') !== key);
            });
        });
    });

    $('[data-program-filter]').each(function () {
        const wrap = $(this);
        const items = wrap.find('.program-item');
        const search = wrap.find('[data-filter-search]');
        const format = wrap.find('[data-filter-format]');
        const level = wrap.find('[data-filter-level]');
        const chips = wrap.find('[data-filter-category]');
        const count = wrap.find('[data-filter-count]');
        const empty = wrap.find('[data-filter-empty]');
        const reset = wrap.find('[data-filter-reset]');
        let category = '';
        let searchTimer;

        const refreshScroll = () => {
            const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
            if (smoother) smoother.refresh();
        };

        function setCategory(value) {
            category = value;
            chips.each(function () {
                const on = $(this).data('filter-category') === value;
                $(this).toggleClass('active', on).attr('aria-pressed', on);
            });
        }

        function apply() {
            const q = $.trim(search.val()).toLowerCase();
            const f = format.val();
            const l = level.val();
            let shown = 0;

            items.each(function () {
                const el = $(this);
                const itemLevel = String(el.data('level'));
                const match =
                    (!category || el.data('category') === category) &&
                    (!f || el.data('format') === f) &&
                    // "Semua Level" cocok untuk level apa pun
                    (!l || itemLevel.indexOf(l) !== -1 || itemLevel === 'semua-level') &&
                    (!q || el.text().toLowerCase().indexOf(q) !== -1);
                el.toggle(match);
                if (match) shown++;
            });

            const active = !!(q || f || l || category);
            count.text(active
                ? 'Menampilkan ' + shown + ' dari ' + items.length + ' kelas'
                : 'Menampilkan ' + items.length + ' kelas');
            reset.prop('hidden', !active);
            empty.prop('hidden', shown > 0);

            // simpan filter di URL agar bisa dibagikan
            const params = new URLSearchParams();
            if (category) params.set('bidang', category);
            if (f) params.set('format', f);
            if (l) params.set('level', l);
            if (q) params.set('cari', q);
            const qs = params.toString();
            history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);

            refreshScroll();
        }

        chips.on('click', function () {
            setCategory($(this).data('filter-category'));
            apply();
            if (category) trackEvent('program_filter', { filter: 'bidang', value: category });
        });
        format.add(level).on('change', function () {
            apply();
            if (this.value) trackEvent('program_filter', { filter: this === format[0] ? 'format' : 'level', value: this.value });
        });
        search.on('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(apply, 150);
        });
        reset.on('click', function () {
            search.val('');
            format.val('');
            level.val('');
            setCategory('');
            apply();
        });

        // Filter awal dari URL, mis. /pelatihan?bidang=ai
        const params = new URLSearchParams(window.location.search);
        const optionExists = (select, v) => v && select.find('option[value="' + v + '"]').length;
        if (params.get('bidang') && chips.filter('[data-filter-category="' + params.get('bidang') + '"]').length) setCategory(params.get('bidang'));
        if (optionExists(format, params.get('format'))) format.val(params.get('format'));
        if (optionExists(level, params.get('level'))) level.val(params.get('level'));
        if (params.get('cari')) search.val(params.get('cari'));
        if (window.location.search) apply();
    });

    /* ==================================================
        Anchor link (#section) yang kompatibel dengan ScrollSmoother
    ================================================== */
    function scrollToHash(hash) {
        const target = hash && hash.length > 1 && document.querySelector(hash);
        if (!target) return false;

        const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
        if (smoother) {
            smoother.scrollTo(target, true, 'top 100px');
        } else {
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
        }
        return true;
    }

    $(document).on('click', 'a[href*="#"]', function (e) {
        const url = new URL(this.href, window.location.href);
        // link dengan query berbeda (mis. ?bidang=ai) dibiarkan memuat halaman agar filter diterapkan
        if (url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
        if (scrollToHash(url.hash)) {
            e.preventDefault();
            $('nav.navbar.validnavs .side').removeClass('on');
            $('.navbar').removeClass('pause-sticked');
            $('body').removeClass('on-side');
        }
    });

    $(window).on('load', function () {
        if (window.location.hash) setTimeout(() => scrollToHash(window.location.hash), 300);
    });

})(jQuery);
