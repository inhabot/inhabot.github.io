var gulp = require('gulp');
var fs = require('fs');
var path = require('path');
var sass = require('gulp-sass'); // module �좎뼵
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var handlebars = require('gulp-compile-handlebars');
var spritesmith = require('gulp.spritesmith');



gulp.task('sass', function() { // gulp $ 紐낅졊��
  gulp.src('src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded',
			indentType: 'tab',
			indentWidth: 1
		}).on('error', sass.logError))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./src/css'));
});

gulp.task('watch', function() {
  gulp.watch('src/scss/**/*.scss', ['sass']); // 蹂�寃� �ы빆�� 二쇱떆�댁빞�� ���� 寃쎈줈
});

gulp.task('sprite', ['makeSprite', 'makeSpriteMap']);

function getFolders(dir) {
	return fs.readdirSync(dir)
		.filter(file => fs.statSync(path.join(dir, file)).isDirectory());
}

gulp.task('makeSprite', () => {
	var stream_arr = [];
	var options = {
		spritesmith: function(folder) {
			return {
				imgPath: path.posix.relative('src/css', path.posix.join('src/img', 'sp_' + folder + '.png')),
				imgName: 'sp_' + folder + '.png',
				cssName: '_sp_' + folder + '.scss',
				cssFormat: 'scss',
				padding: 10,
				cssTemplate: './gulpconf/sprite_template.hbs',
				cssSpritesheetName: 'sp_' + folder
			}
		}
	};

	getFolders('src/sprite').map(folder => {
		var spriteData = gulp.src(path.join('src/sprite', folder, '*.png'))
			.pipe(spritesmith(options.spritesmith(folder)));
		stream_arr.push(new Promise(function(resolve) {
			spriteData.img
				.pipe(gulp.dest('src/img'))
				.on('end',resolve);
		}));
		stream_arr.push(new Promise(function(resolve) {
			spriteData.css
				.pipe(gulp.dest(path.join('src/scss', 'sprite')))
				.on('end', resolve);
		}));
	});
	return Promise.all(stream_arr);
});

gulp.task('makeSpriteMap', ['makeSprite'], () => {
	gulp.src('gulpconf/sprite_maps_template.hbs')
		.pipe(handlebars({
			prefix: 'sp_',
			path: path.posix.relative(path.posix.join('src/scss', 'import'),path.posix.join('src/scss', 'sprite')),
			import: getFolders('src/sprite'),
			ratio: 2
		}))
		.pipe(rename('_sprite_maps.scss'))
		.pipe(gulp.dest(path.join('src/scss', 'import')));
});