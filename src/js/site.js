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
    $('.wa-form').on('submit', function (e) {
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

                if (now > end) {
                    el.remove();
                    if (!$('.event-card').length) $('#event').remove();
                    // hero: tampilkan kartu cadangan (mentor) jika event terdekat sudah lewat
                    if (!$('.hero-event').length) $('[data-event-fallback]').prop('hidden', false);
                    const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
                    if (smoother) smoother.refresh();
                    return;
                }
                el.toggleClass('is-live', live);
                const status = el.find('[data-event-status]');
                status.text(live ? 'Sedang berlangsung' : status.data('label'));

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
            // highlight hanya event terdekat
            $('.event-card').removeClass('is-next').first().addClass('is-next');
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
