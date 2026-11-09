const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require("fs");
const { buildSchema, resolvePrograms } = require('./src/seo/schema');
const SeoFilesPlugin = require('./src/seo/plugin');

const buildDir = path.resolve('build');

// Draft testimoni (approved: false) hanya tampil saat development
const showDrafts = process.env.NODE_ENV !== 'production';
const isDraft = (item) => !!item && item.approved === false;

function generateHbsPaths(appPath, jsonPath) {
    // Create an empty object to store the entry paths
    let entryPaths = {};

    // Define a recursive function to traverse directories and add entry paths
    const traverseDirectory = (dirPath) => {
        // Get all files and directories in the current directory
        try {
            let filesAndDirs = fs.readdirSync(dirPath);

            // Iterate over each file or directory
            filesAndDirs.forEach((fileOrDir) => {
                // Get the full path of the file or directory
                let fullPath = path.join(dirPath, fileOrDir);

                // Check if it's a directory
                if (fs.lstatSync(fullPath).isDirectory()) {
                    // Recursively traverse the directory
                    traverseDirectory(fullPath);
                } else {
                    // Check if it's a Handlebars file
                    if (fileOrDir.endsWith(".hbs")) {
                        let fileName = fileOrDir.replace(".hbs", ".json");
                        let dataPath = path.join(jsonPath, fileName);

                        let relativePath = path
                            .relative(appPath, fullPath)
                            .replace(".hbs", "");

                        if(fs.existsSync(dataPath)) {
                            entryPaths[relativePath] = {
                                import: fullPath,
                                data: dataPath
                            };
                        }else{
                            entryPaths[relativePath] = {
                                import: fullPath
                            };
                        }

                    }
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    // Start traversing the appPath
    traverseDirectory(appPath);

    // Return the entryPaths object
    return entryPaths;
}

function getHbsEntries() {
    const hbsPath = path.resolve(__dirname, 'src/views/pages');
    const jsonPath = path.resolve(__dirname, 'src/views/contents');

    return generateHbsPaths(hbsPath, jsonPath);
}

function getFilename(pathData) {
    let pathArray = path.dirname(pathData.filename).split("/");
    let filepath = '';
    if (pathArray.includes('webfonts') || pathArray.includes('fonts')) {
        filepath = `assets/css/fonts`;
    }else{
        filepath = path
            .dirname(pathData.filename)
            .split("/")
            .slice(1)
            .join("/");
    }
    return `${filepath}/[name][ext][query]`;
}

function copyFolders() {
    let options = [];

    if (fs.existsSync(path.resolve(__dirname, 'src/assets/media/plugins/jstree'))) {
        options.push({
            // copy jstree image
            from: path.resolve(__dirname, 'src/assets/media/plugins/jstree'),
            to: path.resolve(buildDir, 'assets/media/plugins/jstree'),
            force: true
        });
    }

    return options;
}

module.exports = {
    mode: 'development',
    stats: 'errors-only',
    optimization: {
        minimize: true,
        // js and css minimizer
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },
    performance: { hints: false },
    // entry: {
    //     'assets/js/main.bundle': path.resolve(__dirname, 'src/js/main.js')
    // },
    output: {
        path: buildDir,
        clean: true,
    },

    plugins: [
        // konfigurasi server (cPanel/LiteSpeed): HTTPS, URL tanpa .html, 404
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'src/server/.htaccess'), to: '.htaccess', toType: 'file' },
            ],
        }),
        new SeoFilesPlugin({
            contentsDir: path.resolve(__dirname, 'src/views/contents'),
            pagesDir: path.resolve(__dirname, 'src/views/pages'),
            ogImageSrc: path.resolve(__dirname, 'src/assets/img/og-tekoala.jpg'),
        }),
        new HtmlBundlerPlugin({
            entry: {
                ...getHbsEntries()
            },
            outputPath: buildDir,
            // global data (brand, kontak, navigasi) untuk semua halaman
            data: path.resolve(__dirname, 'src/views/contents/global.json'),
            // specify the `handlebars` template engine
            preprocessor: 'handlebars',
            // define handlebars options
            preprocessorOptions: {
                partials: [
                    'src/views/layout',
                    'src/views/partials',
                    'src/views/pages',
                ],
                helpers: {
                    arraySize: (array) => array.length,
                    inc: (value) => parseInt(value) + 1,
                    incPad: (value) => {
                        const num = parseInt(value) + 1;
                        return num < 10 ? '0' + num : String(num);
                    },
                    json: (context) => JSON.stringify(context),
                    eq: (a, b) => a === b,
                    // event yang belum selesai saat build (browser juga menyembunyikan event lewat)
                                        allEvents: (events) => ((events && events.items) || [])
                        .slice()
                        .sort((a, b) => new Date(a.start) - new Date(b.start)),
                    upcomingEvents: (events) => ((events && events.items) || [])
                        .filter((e) => e && e.end && new Date(e.end) >= new Date())
                        .sort((a, b) => new Date(a.start) - new Date(b.start)),
                    hasUpcomingEvents: (events) => ((events && events.items) || []).some((e) => e && e.end && new Date(e.end) >= new Date()),
                    // ambil tanggal/bulan langsung dari string ISO agar tidak bergeser zona waktu
                    isoDay: (iso) => String(iso || '').slice(8, 10),
                    isoMonth: (iso) => ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'][parseInt(String(iso || '').slice(5, 7), 10) - 1] || '',
                    // structured data schema.org untuk halaman aktif
                    jsonLd: (options) => buildSchema(options.data.root),
                    programList: (section, options) => resolvePrograms(section, options.data.root.programCatalog),
                    slug: (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    or: (...args) => args.slice(0, -1).some(Boolean),
                    // testimoni: production hanya menampilkan item yang lengkap & disetujui;
                    // development (npm start) ikut menampilkan draft untuk preview
                    filled: (items) => (items || []).filter((i) => i && i.text && (isDraft(i) ? showDrafts : !!i.name)),
                    // ambil testimoni global sesuai tipe halaman (klien / alumni)
                    ofType: (items, types) => (items || []).filter((i) => (types || []).includes(i.type)),
                    approvedCount: (items) => (items || []).filter((i) => i && i.text && i.name && !isDraft(i) && i.rating).length,
                    avgRating: (items) => {
                        const r = (items || []).filter((i) => i && i.text && i.name && !isDraft(i) && i.rating).map((i) => parseFloat(i.rating));
                        return r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1) : '';
                    },
                    initials: (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
                    stars: (rating) => {
                        const n = Math.round(parseFloat(rating) || 0);
                        return Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'fas' : 'far'} fa-star"></i>`).join('');
                    },
                    concat: (...args) => args.slice(0, -1).join(''),
                    urlencode: (value) => encodeURIComponent(value || '')
                },
            },
            js: {
                // output filename of compiled JavaScript
                filename: 'assets/js/[name].js',
            },
            css: {
                // output filename of extracted CSS
                filename: 'assets/css/[name].css',
            },
            loaderOptions: {
                sources: [
                    {
                        tag: 'div',
                        attributes: ['style'],
                    },
                    {
                        tag: 'section',
                        attributes: ['style'],
                    },
                    {
                        tag: 'li',
                        attributes: ['style'],
                    },
                ],
            },
        })
    ],

    module: {
        rules: [
            {
                test: /\.css$/,
                use: ["css-loader"],
            },
            {
                test: /\.(scss)$/,
                use: [
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: () => [
                                    require('autoprefixer')
                                ]
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            // Prefer `dart-sass`, even if `sass-embedded` is available
                            implementation: require.resolve('sass'),
                            sassOptions: {
                                quietDeps: true
                            },
                            warnRuleAsWarning: false
                        },
                    }
                ],
            },
            {
                test: /\.(ico|png|svg|jpe?g|webp)$/i,
                type: 'asset/resource',
                generator: {
                    // filename: 'assets/media/[name][ext][query]'
                    filename: (pathData) => {
                        return getFilename(pathData)
                    },
                },
            },
            {
                test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                type: 'asset/resource',
                generator: {
                    filename: (pathData) => {
                        return getFilename(pathData)
                    },
                    // filename: 'assets/css/fonts/[name][ext]'
                }
            },
        ],
    },

    // enable live reload
    devServer: {
        static: buildDir,
        open: true,
        // URL tanpa .html (sama seperti .htaccess di server): /pelatihan -> /pelatihan.html
        historyApiFallback: {
            rewrites: [
                { from: /^\/([a-z0-9-]+)\/?$/, to: (ctx) => `/${ctx.match[1]}.html` },
            ],
        },
        watchFiles: {
            paths: ['src/**/*.*'],
            options: {
                usePolling: true,
            },
        },
    },
};