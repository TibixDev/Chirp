const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    plugins: [
        new HtmlWebpackPlugin({
          title: 'Chirp',
          template: './src/index.html'
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'roms', to: 'roms' }
            ]
        })
    ],
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    watch: true,
};