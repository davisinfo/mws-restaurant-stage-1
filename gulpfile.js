var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var cleanCss = require('gulp-clean-css');
var rev = require('gulp-rev');
var del = require('del');

gulp.task('clean-js', function () {
    return del([
        'dist/js/*.js',
        'dist/js/*.js.map'
    ]);
});

gulp.task('clean-css', function () {
    return del([
        'dist/css/*.css'
    ]);
});

gulp.task('pack-js', ['clean-js'], function () {
    gulp.src(['js/vendor/dexie.js', 'js/dbhelper.js', 'js/dialog.js', 'js/restaurant_info.js', 'js/lazyload.js'])
        .pipe(sourcemaps.init())
        // .pipe(babel({
        //     presets: ['env']
        // }))
        .pipe(concat('bundle-info.js'))
        .pipe(minify({
            ext:{
                min:'.js'
            },
            noSource: true
        }))
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))
        .pipe(rev.manifest('dist/rev-manifest.json', {
            merge: true
        }))
        .pipe(gulp.dest(''));

    return gulp.src(['js/vendor/dexie.js', 'js/dbhelper.js', 'js/main.js', 'js/lazyload.js'])
        .pipe(sourcemaps.init())
        // .pipe(babel({
        //     presets: ['env']
        // }))
        .pipe(concat('bundle-main.js'))
        .pipe(minify({
            ext:{
                min:'.js'
            },
            noSource: true
        }))
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))
        .pipe(rev.manifest('dist/rev-manifest.json', {
            merge: true
        }))
        .pipe(gulp.dest(''));
});

gulp.task('pack-css', ['clean-css'], function () {
    return gulp.src(['css/normalize.css', 'css/styles.css'])
        .pipe(concat('stylesheet.css'))
        .pipe(cleanCss())
        .pipe(rev())
        .pipe(gulp.dest('dist/css'))
        .pipe(rev.manifest('dist/rev-manifest.json', {
            merge: true
        }))
        .pipe(gulp.dest(''));
});

gulp.task('watch', function() {
    gulp.watch('js/**/*.js', ['pack-js']);
    gulp.watch('css/**/*.css', ['pack-css']);
});

gulp.task('default', ['watch']);