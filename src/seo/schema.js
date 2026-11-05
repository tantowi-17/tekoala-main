// Membangun structured data (JSON-LD, schema.org) dari data konten halaman.
// Dipakai lewat helper Handlebars {{{jsonLd}}} di layout default.

const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// "Rp 2.499.000" -> 2499000, "2,49jt" -> 2490000, "Sesuai Kebutuhan" -> null
function parsePrice(text) {
    const s = String(text || '').toLowerCase().replace(/rp/g, '').trim();
    const jt = s.match(/^([\d.,]+)\s*jt$/);
    if (jt) return Math.round(parseFloat(jt[1].replace(',', '.')) * 1000000);
    const digits = s.replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
}

// "10 Minggu" -> "P10W", "1 - 5 Hari" -> "P5D"
function parseDuration(text) {
    const s = String(text || '').toLowerCase();
    const n = (s.match(/\d+/g) || []).pop();
    if (!n) return null;
    if (s.includes('minggu')) return `P${n}W`;
    if (s.includes('hari')) return `P${n}D`;
    if (s.includes('bulan')) return `P${n}M`;
    return null;
}

// Program untuk satu section: semua katalog, atau pilihan "show" (judul + override seperti featured)
function resolvePrograms(section, catalog) {
    const items = (catalog && catalog.items) || [];
    if (!section || !Array.isArray(section.show)) return items;
    return section.show
        .map((pick) => {
            const base = items.find((i) => i.title === pick.title);
            if (!base) console.warn(`[programs] "${pick.title}" tidak ada di programCatalog (global.json)`);
            return base ? { ...base, ...pick } : null;
        })
        .filter(Boolean);
}

function pageUrl(root) {
    const path = (root.meta && root.meta.path) || '';
    return `${root.siteUrl}/${path}`;
}

function organization(root) {
    const orgId = `${root.siteUrl}/#organization`;
    return {
        '@type': ['EducationalOrganization', 'LocalBusiness'],
        '@id': orgId,
        name: `${root.brand.name} ${root.brand.tagline}`,
        alternateName: root.brand.name,
        url: `${root.siteUrl}/`,
        logo: `${root.siteUrl}/${root.ogImage}`,
        image: `${root.siteUrl}/${root.ogImage}`,
        description: root.brand.description,
        email: root.email,
        telephone: `+${root.phone}`,
        priceRange: 'Rp',
        sameAs: [root.instagram].filter(Boolean),
        knowsAbout: root.brand.knowsAbout || [],
        areaServed: { '@type': 'Country', name: 'Indonesia' },
        address: (root.locations || []).map((l) => ({
            '@type': 'PostalAddress',
            streetAddress: l.area,
            addressLocality: l.locality,
            addressRegion: l.region,
            addressCountry: l.country,
        })),
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: `+${root.phone}`,
            email: root.email,
            availableLanguage: ['id'],
        },
    };
}

function courses(root, orgId) {
    const items = root.programs ? resolvePrograms(root.programs, root.programCatalog) : [];
    return items.map((p) => {
        const price = parsePrice(p.price);
        const duration = parseDuration(p.duration);
        const online = p.format !== 'In-House';
        const course = {
            '@type': 'Course',
            name: p.title,
            description: p.description,
            url: `${root.siteUrl}/pelatihan.html#program`,
            provider: { '@id': orgId },
            inLanguage: 'id',
            educationalLevel: p.level,
            about: p.category || undefined,
            courseCode: undefined,
            hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: online ? 'Online' : 'Onsite',
                ...(duration ? { courseSchedule: { '@type': 'Schedule', duration, repeatFrequency: 'P1W' } } : {}),
            },
        };
        if (price) {
            course.offers = {
                '@type': 'Offer',
                category: 'Paid',
                price,
                priceCurrency: 'IDR',
                availability: 'https://schema.org/InStock',
                url: `${root.siteUrl}/pelatihan.html#program`,
            };
        }
        return JSON.parse(JSON.stringify(course)); // buang field undefined
    });
}

function services(root, orgId) {
    const items = (root.services && root.services.items) || [];
    const prices = ((root.pricing && root.pricing.items) || []).reduce((acc, p) => {
        acc[p.name] = parsePrice(p.price);
        return acc;
    }, {});
    return items.map((s) => ({
        '@type': 'Service',
        name: s.title,
        serviceType: s.label,
        description: s.description,
        provider: { '@id': orgId },
        areaServed: { '@type': 'Country', name: 'Indonesia' },
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: s.title,
            itemListElement: (s.list || []).map((name) => ({
                '@type': 'Offer',
                itemOffered: { '@type': 'Service', name },
                ...(prices[name] ? { price: prices[name], priceCurrency: 'IDR' } : {}),
            })),
        },
    }));
}

function people(root, orgId) {
    const items = (root.team && root.team.items) || [];
    return items.map((m) => {
        const sameAs = [m.social && m.social.linkedin, m.social && m.social.instagram].filter(Boolean);
        return {
            '@type': 'Person',
            name: m.name,
            jobTitle: m.title,
            worksFor: { '@id': orgId },
            ...(m.bio ? { description: m.bio } : {}),
            ...(m.tags && m.tags.length ? { knowsAbout: m.tags } : {}),
            ...(sameAs.length ? { sameAs } : {}),
        };
    });
}

function events(root, orgId) {
    // hanya di beranda (tempat section event ditampilkan), event yang belum selesai
    if (root.pageKey !== 'index') return [];
    const items = ((root.events && root.events.items) || []).filter((e) => e.end && new Date(e.end) >= new Date());
    return items.map((e) => {
        const online = /online|zoom|meet/i.test(e.format || '');
        return {
            '@type': 'Event',
            name: e.title,
            description: e.description,
            startDate: e.start,
            endDate: e.end,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
            location: online
                ? { '@type': 'VirtualLocation', url: `${root.siteUrl}/#event` }
                : { '@type': 'Place', name: e.location || root.brand.name },
            image: `${root.siteUrl}/${root.ogImage}`,
            organizer: { '@id': orgId },
            ...(e.speaker ? { performer: { '@type': 'Person', name: e.speaker, jobTitle: e.speakerRole } } : {}),
            isAccessibleForFree: /gratis|free/i.test(e.price || ''),
            offers: {
                '@type': 'Offer',
                price: /gratis|free/i.test(e.price || '') ? 0 : parsePrice(e.price),
                priceCurrency: 'IDR',
                availability: 'https://schema.org/InStock',
                url: `${root.siteUrl}/#event`,
            },
            inLanguage: 'id',
        };
    });
}

function faqPage(root, url) {
    const items = (root.faq && root.faq.items) || [];
    if (!items.length) return null;
    return {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: items.map((f) => ({
            '@type': 'Question',
            name: stripHtml(f.q),
            acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.a) },
        })),
    };
}

function breadcrumb(root, url) {
    if (!root.breadcrumb) return null;
    return {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${root.siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: root.breadcrumb.current, item: url },
        ],
    };
}

function buildSchema(root) {
    const orgId = `${root.siteUrl}/#organization`;
    const siteId = `${root.siteUrl}/#website`;
    const url = pageUrl(root);
    const description = (root.meta && root.meta.description) || root.brand.description;

    const graph = [
        organization(root),
        {
            '@type': 'WebSite',
            '@id': siteId,
            url: `${root.siteUrl}/`,
            name: `${root.brand.name} ${root.brand.tagline}`,
            inLanguage: 'id',
            publisher: { '@id': orgId },
        },
        {
            '@type': 'WebPage',
            '@id': `${url}#webpage`,
            url,
            name: root.page_title,
            description,
            inLanguage: 'id',
            isPartOf: { '@id': siteId },
            about: { '@id': orgId },
            primaryImageOfPage: `${root.siteUrl}/${root.ogImage}`,
            ...(root.breadcrumb ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
        },
        breadcrumb(root, url),
        faqPage(root, url),
        ...events(root, orgId),
        ...courses(root, orgId),
        ...services(root, orgId),
        ...people(root, orgId),
    ].filter(Boolean);

    // escape "<" agar aman di dalam <script>
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 0).replace(/</g, '\\u003c');
}

module.exports = { buildSchema, resolvePrograms, parsePrice, parseDuration, stripHtml };
