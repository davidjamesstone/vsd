var supermodels = require('supermodels.js')
var Main = require('../controller')
var files = window.UCO.files

function findFile (relativePath) {
  return files.find(function (item) {
    return item.getRelativePath().toUpperCase() === relativePath.toUpperCase()
  })
}

function findFiles (extension) {
  return files.filter(function (item) {
    return item.path.endsWith(extension)
  })
}

function searchFiles () {
  var query = this.query.toLowerCase()
  return files.filter(function (item) {
    return item.isFile && ~item.getRelativePath().toLowerCase().indexOf(query)
  })
}

function getLinks () {
  var links = []
  var file

  file = findFile('README.md')
  if (file) {
    links.push({ icon: 'info', text: 'README.md', file: file })
  }

  file = findFile('package.json')
  if (file) {
    links.push({ icon: 'cog', text: 'package.json', file: file })
  }

  file = findFile('index.js')
  if (file) {
    links.push({ icon: 'play-circle', text: 'Start', file: file })
  }

  file = findFile('config')
  if (file) {
    var config = { icon: 'cogs', text: 'Config', children: [] }
    file = findFile('config/index.js')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'index.js', file: file })
    }
    file = findFile('config/schema.js')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'schema.js', file: file })
    }
    file = findFile('config/client.json"')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'client.json"', file: file })
    }
    file = findFile('config/server.json')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'server.json', file: file })
    }
    file = findFile('config/pm2.json')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'pm2.json', file: file })
    }

    if (config.children.length) {
      links.push(config)
    }
  }

  file = findFile('server/manifest.js')
  if (file) {
    links.push({ icon: 'cubes', text: 'Manifest', file: file })
  }

  file = findFiles('db.json')
  if (file.length) {
    if (file.length > 1) {
      var dbs = { icon: 'database', text: 'DB', children: [] }

      file.forEach(function (item) {
        dbs.children.push({ icon: 'circle-o', text: item.name, file: item })
      })

      links.push(dbs)
    } else {
      links.push({ icon: 'database', text: 'DB', file: file[0] })
    }
  }

  file = findFiles('routes.json')
  if (file.length) {
    if (file.length > 1) {
      var routes = { icon: 'exchange', text: 'Routes', children: [] }

      file.forEach(function (item) {
        routes.children.push({ icon: 'circle-o', text: item.name, file: item })
      })

      links.push(routes)
    } else {
      links.push({ icon: 'exchange', text: 'Routes', file: file[0] })
    }
  }

  file = findFile('server/views/index.js')
  if (file) {
    links.push({ icon: 'code', text: 'Views', file: file })
  }

  return links
}

var schema = {
  main: Main,
  name: String,
  recent: Object,
  query: String,
  getLinks: getLinks,
  searchFiles: searchFiles
}

var Controller = supermodels(schema)

module.exports = Controller
