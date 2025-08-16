const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require("fs");

const buildDir = path.resolve('build');

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
        new HtmlBundlerPlugin({
            entry: {
                ...getHbsEntries()
            },
            outputPath: buildDir,
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
                    json: (context) => JSON.stringify(context)
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
        watchFiles: {
            paths: ['src/**/*.*'],
            options: {
                usePolling: true,
            },
        },
    },
};