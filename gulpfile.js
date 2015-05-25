/**
 * Would love to use cssgrace:
 * https://github.com/cssdream/cssgrace
 * but it seems to have issues working
 * with my preferred SVG support method
 */
var gulp = require('gulp'),
    postcss = require('gulp-postcss'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    imagemin = require('gulp-imagemin'),
    changed = require('gulp-changed'),
    raster = require('gulp-raster'),
    svgSprite = require('gulp-svg-sprite')
    rename = require('gulp-rename'),
    bless = require('gulp-bless'),
    pxtorem = require('postcss-pxtorem'),
    browsersync = require("browser-sync").create(),
    argv = require('yargs').argv,
    gulpif = require('gulp-if');

var app = {
  build: './build',
  ship: './ship',
  img: '/img',
  js: '/js',
  css: '/css'
}

var sources = {
  html: './build/*.html',
  css: './build/css/*.css',
  mainCSS: './build/css/site.live.css',
  js: './build/js/*.js',
  mainJS: './build/js/site.js',
  raster: './build/img/*.{png,jpg,gif}',
  vector: './build/img/*.svg',
  icons: './ship/img/icons',
  sprite: './build/img/icons/*.svg',
  symbol: './build/symbol/svg/*.svg',
  notSymbol: '!./build/img/sprite.symbol.svg',
};

var processors = [
      // Use tomorrow's CSS… TODAY!
      require('cssnext')({
        compress: true,
        browserlist: ['last 2 versions','ie8','> 5%']
      }),
      // Combine media queries
      require('css-mqpacker'),
      // Simplify z-index
      require('postcss-zindex'),
      // Merge idenitcal rules to simplify CSS
      require('postcss-merge-rules'),
      // Remove unneeded @font-face references
      require('postcss-discard-font-face'),
      // Neaten up z-index rule
      require('postcss-zindex'),
      // Purge empty CSS rules
      require('postcss-discard-empty'),
//      pxtorem({
//        replace: false
//      }),
    ],
    spriteConfig = {
      mode : {
        css: {
          hasCommon: true,
          common: 'sprite-graphic:after',
          mode: 'css',
          sprite: '../img/sprite.svg',
          // Gives me a .element:after for styling SVG goodness
          prefix: '.sprite-%s:after',
          // Gimme dat sweet sweet CSS
          render: {
            css: {
              template: './build/sprite.css',
              dest: 'sprite.css',
            },
          },
        },
        symbol : true,
      }
    },
    imageConfig = {
      optimizationLevel: 3,
      progressive: true,
      interlaced: true,
      multipass: true,
    },
    tasks = ['lint', 'compress', 'css', 'svg', 'images', 'html', 'watch'];

gulp.task('server', tasks, function() {
  browsersync.init({
    server: "./ship/"
  });
});

// Convert series of SVG files to an SVG Sprite
gulp.task('sprites', function () {
  'use strict';
  gulp.src(sources.sprite)
    .pipe(changed(app.icons))
    .pipe(svgSprite(spriteConfig))
    .pipe(gulp.dest(app.build));
  gulp.src(sources.symbol)
    .pipe(gulp.dest(app.build+app.img));
  gulp.start('raster');
});

// Optimise SVG files
gulp.task('svg', function() {
  'use strict';
  return gulp.src(sources.vector)
    .pipe(changed(app.ship+app.img))
    .pipe(imagemin(imageConfig))
    .pipe(gulp.dest(app.ship+app.img));
});

// Convert SVG to PNG
gulp.task('raster', ['svg'], function() {
  'use strict';
  // Save as @1x PNG
  gulp.src([sources.vector, app.notSymbol])
    .pipe(changed(app.ship+app.img))
    .pipe(raster({format: 'png'}))
    .pipe(rename({extname: '.svg.png'}))
    .pipe(imagemin(imageConfig))
    .pipe(gulp.dest(app.ship+app.img));
  // Save as @2x PNG
  gulp.src([sources.vector, app.notSymbol])
    .pipe(changed(app.ship+app.img))
    .pipe(raster({format: 'png', scale: 2}))
    .pipe(rename({extname: '.svg.png', suffix: '-2x'}))
    .pipe(imagemin(imageConfig))
    .pipe(gulp.dest(app.ship+app.img));
});

// Optimise Images
gulp.task('images', function() {
  'use strict';
  return gulp.src(sources.raster)
    .pipe(changed(app.ship+app.img))
    .pipe(imagemin(imageConfig))
    .pipe(gulp.dest(app.ship+app.img));
});

// List main js file
gulp.task('lint', function() {
  'use strict';
  return gulp.src(sources.mainJS)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Compress JS
gulp.task('compress', ['lint'], function() {
  'use strict';
  return gulp.src(sources.js)
    .pipe(concat('site.live.js'))
    .pipe(gulpif(argv.production, uglify()))
    .pipe(gulp.dest(app.ship+app.js));
});

// PostCSS Goodness
gulp.task('css', function() {
  'use strict';
  return gulp.src(sources.mainCSS)
    .pipe(postcss(processors))
    .pipe(bless())
    .pipe(gulp.dest(app.ship+app.css));
});

// PostCSS Goodness
gulp.task('html', function() {
  'use strict';
  return gulp.src(sources.html)
    .pipe(gulp.dest(app.ship));
});

// Watch Files For Changes
gulp.task('watch', function() {
  'use strict';
  gulp.watch(sources.js, ['compress', browsersync.reload]);
  gulp.watch(sources.css, ['css', browsersync.reload]);
  gulp.watch(sources.vector, ['svg', 'images', browsersync.reload]);
  gulp.watch(sources.raster, ['images', browsersync.reload]);
  gulp.watch(sources.sprite, ['sprites', browsersync.reload]);
  gulp.watch(sources.html, ['html', browsersync.reload]);
});

// Default Task
gulp.task('default', ['server']);