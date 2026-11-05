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

        // Filter awal dari URL, mis. pelatihan.html?bidang=ai
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
