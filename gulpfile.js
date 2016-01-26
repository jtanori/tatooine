var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');

var paths = {
    sass: ['./scss/**/*.scss'],
    js: [
        'public/js/**/*.js',
        '!public/js/Crypto.MD5.min.js',
        '!public/js/Crypto.SHA3.min.js',
        '!public/js/ngIOS9UIWebViewPatch.js',
        '!public/js/parse-1.5.0.min.js',
        '!public/js/underscore.strings.min.js',
        '!public/js/ng-map.min.js',
        '!public/js/swiper.min.js'
    ]
};

gulp.task('jshint', function(){
    return gulp.src(paths.js)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));

});

gulp.task('default', ['sass', 'jshint']);

gulp.task('sass', function(done) {
  gulp.src(paths.sass)
    .pipe(sass({
      errLogToConsole: true,
      compass: true
    }))
    .pipe(gulp.dest('./public/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./public/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch('./scss/ionic.app.scss', ['sass']);
  gulp.watch('./public/js/**/*.js', ['jshint']);
});
