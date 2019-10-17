var gulp = require('gulp'),
javascriptObfuscator = require('gulp-javascript-obfuscator'),
htmlmin = require('gulp-htmlmin'),
jsonModify = require('gulp-json-modify'),
bower = require('gulp-bower');

var extensionKey = process.env.applicationExtensionKey;

gulp.task('default',['bower','jsonModify','minify','obfuscate'], function() {

});

gulp.task('development',['bower','jsonModify'], function() {

});

gulp.task('minify', function() {
    return gulp.src('public/index.html')
      .pipe(htmlmin({collapseWhitespace: true,removeComments: true}))
      .pipe(gulp.dest('public'));
  });

gulp.task('obfuscate', function() {
    return gulp.src('public/js/customActivity.js')
    .pipe(javascriptObfuscator({
        compact:true,
        sourceMap: true
    }))
    .pipe(gulp.dest('public/js'));
});

gulp.task('jsonModify', function () {
 
    return gulp.src('public/config.json')
      .pipe(jsonModify({
        key:'configurationArguments.applicationExtensionKey',
        value: extensionKey
      }))
      .pipe(gulp.dest('public'));
});

gulp.task('bower', function() {
    return bower();
  });