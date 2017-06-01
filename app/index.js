const Generator = require('yeoman-generator');
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');
const mv = require('mv');
const rimraf = require('rimraf');

const unwantedFiles = [
  '/wp-content/themes/twentyfifteen',
  '/wp-content/themes/twentyseventeen',
  '/wp-content/themes/twentysixteen',
  '/wp-content/plugins/hello.php',
  '/wp-content/plugins/akismet',
];

const config = {
  dir: './wp',
  tmp: './.tmp',
  wpZipball: 'https://wordpress.org/latest.zip',
  barebonesZipball: 'https://github.com/benchmarkstudios/barebones/archive/master.zip',
};

const log = console.log;

const zipinator = (zipballUri = false, target = config.tmp, localName = 'zipinator', entry = false, callback = false) => {
  if (!zipballUri) {
    return false;
  }

  log(`📥 Downloading ${localName}..`);

  const local = `${localName}.zip`;
  const output = fs.createWriteStream(`${config.tmp}/${local}`);

  const req = request({
    method: 'GET',
    uri: zipballUri,
    headers: {
      'Accept-Encoding': 'gzip,deflate,sdch',
    },
  });

  req.pipe(output);

  return req.on('end', () => {
    log(`🗄 Unzipping ${localName}..`);

    fs.createReadStream(`${config.tmp}/${local}`).pipe(unzip.Extract({ path: config.tmp })).on('finish', () => {
      rimraf(target, () => {
        mv(`${config.tmp}/${entry}`, target, (err) => {
          if (!err) {
            rimraf(`${config.tmp}/${entry}`, () => {
              log(`🔥 ${config.tmp}/${entry}`);
            });
            rimraf(`${config.tmp}/${local}`, () => {
              log(`🔥 ${config.tmp}/${local}`);
            });

            if (callback) {
              return callback();
            }
          }

          return true;
        });
      });
    });
  });
};

module.exports = class extends Generator {
  consstructor(args) {
    this.projectName = args || 'barebones';
  }

  barebones() {
    // zipinator(config.wpZipball, config.dir, 'wordpress', 'wordpress', () => {
    //   this.log('🚧 Cleaning up unwanted files..');
    //   unwantedFiles.forEach((file) => {
    //     rimraf(config.dir + file, () => {
    //       this.log(`🔥 ${file}`);
    //     });
    //   });

      zipinator(config.barebonesZipball, `${config.dir}/wp-content/themes/${this.projectName}`, 'barebones', 'barebones-master');
    // });
  }
};
