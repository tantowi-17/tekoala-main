// Plugin webpack: membuat robots.txt, sitemap.xml, llms.txt, dan menyalin gambar og:image
// dari data konten (src/views/contents/*.json) setiap kali build.
const fs = require('fs');
const path = require('path');
const { stripHtml, resolvePrograms } = require('./schema');

const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'meta-externalagent'];

class SeoFilesPlugin {
    constructor({ contentsDir, pagesDir, ogImageSrc }) {
        this.contentsDir = contentsDir;
        this.pagesDir = pagesDir;
        this.ogImageSrc = ogImageSrc;
    }

    readJson(name) {
        const file = path.join(this.contentsDir, `${name}.json`);
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    }

    pages() {
        const order = ['index', 'pelatihan', 'layanan', 'kontak'];
        const rank = (n) => (order.includes(n) ? order.indexOf(n) : order.length);
        return fs.readdirSync(this.pagesDir)
            .filter((f) => f.endsWith('.hbs'))
            .map((f) => f.replace('.hbs', ''))
            .sort((a, b) => rank(a) - rank(b))
            .map((name) => ({ name, data: this.readJson(name) }))
            // halaman noindex (mis. 404) tidak masuk sitemap & llms.txt
            .filter(({ data }) => !String((data.meta && data.meta.robots) || '').includes('noindex'));
    }

    // path sesuai canonical: meta.path ("" untuk beranda), fallback nama-file.html
    static pathOf({ name, data }) {
        return data.meta && typeof data.meta.path === 'string' ? data.meta.path : `${name}.html`;
    }

    robots(g) {
        const lines = ['User-agent: *', 'Allow: /', ''];
        // Izinkan eksplisit crawler AI agar konten bisa dikutip asisten AI
        AI_CRAWLERS.forEach((bot) => lines.push(`User-agent: ${bot}`, 'Allow: /', ''));
        lines.push(`Sitemap: ${g.siteUrl}/sitemap.xml`, '');
        return lines.join('\n');
    }

    sitemap(g, pages) {
        const today = new Date().toISOString().slice(0, 10);
        const priority = { index: '1.0', pelatihan: '0.9', layanan: '0.8', kontak: '0.6' };
        const urls = pages.map(({ name, data }) => {
            const loc = `${g.siteUrl}/${SeoFilesPlugin.pathOf({ name, data })}`;
            return [
                '  <url>',
                `    <loc>${loc}</loc>`,
                `    <lastmod>${today}</lastmod>`,
                `    <changefreq>${name === 'index' || name === 'pelatihan' ? 'weekly' : 'monthly'}</changefreq>`,
                `    <priority>${priority[name] || '0.5'}</priority>`,
                '  </url>',
            ].join('\n');
        });
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    }

    // Ringkasan situs dalam Markdown untuk asisten/mesin AI (standar llms.txt)
    llms(g, pages) {
        const page = (n) => (pages.find((p) => p.name === n) || {}).data || {};
        const home = page('index');
        const pel = page('pelatihan');
        const lay = page('layanan');
        const url = (p) => `${g.siteUrl}/${p}`;
        const out = [];

        out.push(`# ${g.brand.name} ${g.brand.tagline}`, '');
        out.push(`> ${g.brand.description}`, '');
        out.push(`Tekoala menyediakan dua hal: (1) pelatihan dan bootcamp skill digital (web development, digital marketing, AI, data analytics) untuk individu, UMKM, perangkat desa, dan instansi; (2) jasa pembuatan website, aplikasi, dan digital marketing untuk bisnis dan instansi. Berbasis di ${(g.locations || []).map((l) => `${l.area}, ${l.locality}, ${l.region}`).join(' dan ')}, melayani seluruh Indonesia (online).`, '');

        out.push('## Program Pelatihan', '');
        resolvePrograms(pel.programs, g.programCatalog).forEach((p) => {
            const price = p.priceNormal ? `${p.price} (normal ${p.priceNormal})` : p.price;
            out.push(`- **${p.title}** (${p.format}, ${p.duration}, level ${p.level}, bidang ${p.category || '-'}): ${p.description} Biaya: ${price}.`);
        });
        out.push('', `Daftar lengkap dan filter kelas: ${url('pelatihan.html')}`, '');

        out.push('## Layanan Bisnis', '');
        ((lay.services && lay.services.items) || []).forEach((s) => {
            out.push(`- **${s.title}** (${s.label}): ${s.description} Meliputi: ${(s.list || []).join(', ')}.`);
        });
        ((lay.pricing && lay.pricing.items) || []).forEach((p) => {
            out.push(`- Paket ${p.name}: ${p.note.toLowerCase()} ${p.prefix} ${p.price}.`);
        });
        if (lay.pricing && lay.pricing.footnote) out.push(`- ${stripHtml(lay.pricing.footnote)}`);
        out.push('', `Detail layanan: ${url('layanan.html')}`, '');

        const team = home.team || {};
        if ((team.items || []).length) {
            out.push('## Tim', '');
            team.items.forEach((m) => out.push(`- ${m.name}: ${m.title}${m.experience ? `, ${m.experience}` : ''}.`));
            if ((team.certifications || []).length) {
                out.push(`- Kredensial tim: ${team.certifications.map((c) => c.title).join(', ')}.`);
            }
            out.push('');
        }

        const faqs = [...((home.faq && home.faq.items) || []), ...((pel.faq && pel.faq.items) || [])];
        if (faqs.length) {
            out.push('## FAQ', '');
            const seen = new Set();
            faqs.forEach((f) => {
                if (seen.has(f.q)) return;
                seen.add(f.q);
                out.push(`- **${stripHtml(f.q)}** ${stripHtml(f.a)}`);
            });
            out.push('');
        }

        out.push('## Kontak', '');
        out.push(`- WhatsApp: ${g.phoneDisplay} (https://wa.me/${g.phone})`);
        out.push(`- Email: ${g.email}`);
        out.push(`- Instagram: ${g.instagram}`);
        out.push(`- Form konsultasi: ${url('kontak.html')}`, '');

        out.push('## Halaman', '');
        pages.forEach(({ name, data }) => {
            const p = SeoFilesPlugin.pathOf({ name, data });
            const title = (data.meta && data.meta.title) || data.page_title || name;
            out.push(`- [${title}](${url(p)}): ${(data.meta && data.meta.description) || ''}`);
        });
        out.push('');
        return out.join('\n');
    }

    apply(compiler) {
        const { sources, Compilation } = compiler.webpack;
        compiler.hooks.thisCompilation.tap('SeoFilesPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
                { name: 'SeoFilesPlugin', stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
                () => {
                    const g = this.readJson('global');
                    const pages = this.pages();
                    compilation.emitAsset('robots.txt', new sources.RawSource(this.robots(g)));
                    compilation.emitAsset('sitemap.xml', new sources.RawSource(this.sitemap(g, pages)));
                    compilation.emitAsset('llms.txt', new sources.RawSource(this.llms(g, pages)));
                    if (this.ogImageSrc && fs.existsSync(this.ogImageSrc)) {
                        compilation.emitAsset(g.ogImage, new sources.RawSource(fs.readFileSync(this.ogImageSrc)));
                    }
                }
            );
            // file konten ikut dipantau saat npm start
            compilation.fileDependencies.add(this.contentsDir);
        });
    }
}

module.exports = SeoFilesPlugin;
