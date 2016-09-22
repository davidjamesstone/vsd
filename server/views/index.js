const config = require('../../config')
const pkg = require('../../package.json')
const year = (new Date()).getFullYear()

module.exports = {
  engines: {
    html: require('handlebars')
  },
  relativeTo: __dirname,
  layout: true,
  isCached: config.views.isCached,
  partialsPath: 'partials',
  // helpersPath: 'helpers',
  context: {
    pkg: pkg,
    siteName: 'name.co',
    copyrightName: 'stoneware.co',
    copyrightYear: year > 2016 ? '2016' + (new Date()).getFullYear() : year.toString(),
    assetsPath: '/public/',
    adminAssetsPath: '/public/admin/'
  }
}
