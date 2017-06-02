const Generator = require('yeoman-generator');
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');
const copy = require('copy');
const rimraf = require('rimraf');

const unwantedFiles = [
  '/wp-content/themes/twentyfifteen',
  '/wp-content/themes/twentyseventeen',
  '/wp-content/themes/twentysixteen',
  '/wp-content/plugins/hello.php',
  '/wp-content/plugins/akismet',
];

const plugins = {
  acf: 'Advanced Custom Fields PRO',
  yoast: 'Yoast SEO',
  regeneratethumbs: 'Regenrate Thumbnails',
  querymonitor: 'Query Monitor',
  smushit: 'WP Smush it',
  disablecomments: 'Disable Comments',
  cf7: 'Contact Form 7',
};

const pluginNames = {
  acf: 'advanced-custom-fields-pro',
  yoast: 'wordpress-seo',
  regeneratethumbs: 'regenerate-thumbnails',
  querymonitor: 'query-monitor',
  smushit: 'wp-smushit',
  disablecomments: 'disable-comments',
  cf7: 'contact-form-7',
};

const pluginZipballs = {
  plugin_acf: 'https://connect.advancedcustomfields.com/index.php?p=pro&a=download&k=',
  plugin_yoast: 'https://downloads.wordpress.org/plugin/wordpress-seo.zip',
  plugin_regeneratethumbs: 'https://downloads.wordpress.org/plugin/regenerate-thumbnails.zip',
  plugin_querymonitor: 'https://downloads.wordpress.org/plugin/query-monitor.zip',
  plugin_smushit: 'https://downloads.wordpress.org/plugin/wp-smushit.zip',
  plugin_disablecomments: 'https://downloads.wordpress.org/plugin/disable-comments.zip',
  plugin_cf7: 'https://downloads.wordpress.org/plugin/contact-form-7.zip',
};

const config = {
  dir: process.cwd(),
  tmp: './.tmp',
  wpZipball: 'https://wordpress.org/latest.zip',
  barebonesZipball: 'https://github.com/benchmarkstudios/barebones/archive/master.zip',
};

let afcLicence = null;
let templatePath = null;

const log = console.log;

const zipinator = (zipballUri = false, target = config.tmp, localName = 'zipinator', entry = localName, callback = false) => {
  if (!zipballUri) {
    return false;
  }

  log(`📥 Downloading ${localName}..`);

  const local = `${localName}.zip`;
  const output = fs.createWriteStream(`${config.tmp}/${local}`);

  let uri = zipballUri;
  // attach licence if acf
  if (localName === 'advanced-custom-fields-pro') {
    uri = zipballUri + afcLicence;
  }

  const req = request({
    method: 'GET',
    uri,
    headers: {
      'Accept-Encoding': 'gzip,deflate,sdch',
    },
  });

  req.pipe(output);

  return req.on('end', () => {
    log(`🗄 Unzipping ${localName}..`);

    fs.createReadStream(`${config.tmp}/${local}`).pipe(unzip.Extract({ path: config.tmp })).on('finish', () => {
      rimraf(`${config.tmp}/${local}`, () => {
        log(`🔥 ${config.tmp}/${local}`);

        return copy(`${config.tmp}/${entry}/**/*`, `${target}/`, () => {
          // rimraf(`${config.tmp}/${entry}`, () => {
          //   log(`🔥 ${config.tmp}/${entry}`);
          // });

          if (callback) {
            return callback();
          }
        });
      });
    });
  });
};

const readmenator = (projectName) => {
  const file = 'README.md';
  fs.readFile(`${templatePath}/${file}`, 'utf8', (err, data) => {
    log(`✏️ Generating ${file} file..`);
    if (err) {
      return log(err);
    }
    const result = data.replace(/{{ name }}/g, projectName);
    return fs.writeFile(`${config.dir}/${file}`, result, (err) => {
      if (err) {
        return log(err);
      }

      return true;
    });
  });
};

const pluginator = (plugins, callback) => {
  Object.keys(plugins).forEach((key) => {
    if (plugins[key]) {
      zipinator(pluginZipballs[key], `${config.dir}/wp-content/plugins/${pluginNames[key.replace('plugin_', '')]}`, pluginNames[key.replace('plugin_', '')]);
    }
  });

  return callback();
};

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    console.log(config.dir);
    templatePath = this.sourceRoot();
    this.argument('projectName', { type: String, required: true });
  }

  prompting() {
    const items = [];
    Object.keys(plugins).forEach((key) => {
      items.push({
        type: 'confirm',
        name: `plugin_${key}`,
        message: `Would you like to install ${plugins[key]} plugin?`,
      });
    });

    return this.prompt(items).then((answers) => {
      this.plugins = answers;

      if (answers.plugin_acf) {
        this.log('\n');
        return this.prompt([{
          type: 'input',
          name: 'plugin_acf_licence',
          message: 'Enter your Advanced Custom Fields licence key',
          default: '',
        }]).then((answer) => {
          afcLicence = answer.plugin_acf_licence;
          this.plugins.plugin_acf_licence = answer.plugin_acf_licence;
        });
      }

      return this.plugins;
    });
  }

  barebones() {
    if (!fs.existsSync(config.tmp)) {
      fs.mkdirSync(config.tmp);
    }

    this.log('\nCool, setting you up! 🚀\n');

    zipinator(config.wpZipball, config.dir, 'wordpress', 'wordpress', () => {
      zipinator(config.barebonesZipball, `${config.dir}/wp-content/themes/${this.options.projectName}`, 'barebones', 'barebones-master');
      readmenator(this.options.projectName);
      pluginator(this.plugins, () => {
        this.log('🚧 Cleaning up unwanted files..');
        unwantedFiles.forEach((file) => {
          rimraf(config.dir + file, () => {
            this.log(`🔥 ${file}`);
          });
        });
      });
    });
  }
};
