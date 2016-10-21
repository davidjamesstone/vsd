var path = require('path')
var supermodels = require('supermodels.js')
var recent = require('../recent')
var sessions = require('../sessions')
var editor = require('../ace/editor')
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
    links.push({ icon: 'info', text: 'README.md', href: '#readme.md' })
  }

  file = findFile('package.json')
  if (file) {
    links.push({ icon: 'cog', text: 'package.json', href: '#package.json' })
  }

  file = findFile('index.js')
  if (file) {
    links.push({ icon: 'play-circle', text: 'Start', href: '#index.js' })
  }

  file = findFile('config')
  if (file) {
    var config = { icon: 'cogs', text: 'Config', children: [] }
    file = findFile('config/index.js')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'index.js', href: '#config/index.js' })
    }
    file = findFile('config/schema.js')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'schema.js', href: '#config/schema.js' })
    }
    file = findFile('config/client.json"')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'client.json"', href: '#config/client.json"' })
    }
    file = findFile('config/server.json')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'server.json', href: '#config/server.json' })
    }
    file = findFile('config/pm2.json')
    if (file) {
      config.children.push({ icon: 'circle-o', text: 'pm2.json', href: '#config/pm2.json' })
    }

    if (config.children.length) {
      links.push(config)
    }
  }

  file = findFile('server/manifest.js')
  if (file) {
    links.push({ icon: 'cubes', text: 'Manifest', href: '#server/manifest.js' })
  }

  file = findFiles('db.json')
  if (file.length) {
    if (file.length > 1) {
      var dbs = { icon: 'database', text: 'DB', children: [] }

      file.forEach(function (item) {
        dbs.children.push({ icon: 'circle-o', text: item.name, href: '#' + item.getRelativePath() })
      })

      links.push(dbs)
    } else {
      links.push({ icon: 'database', text: 'DB', href: '#' + file[0].getRelativePath() })
    }
  }

  file = findFiles('routes.json')
  if (file.length) {
    if (file.length > 1) {
      var routes = { icon: 'exchange', text: 'Routes', children: [] }

      file.forEach(function (item) {
        routes.children.push({ icon: 'circle-o', text: item.name, href: '#' + item.getRelativePath() })
      })

      links.push(routes)
    } else {
      links.push({ icon: 'exchange', text: 'Routes', href: '#' + file[0].getRelativePath() })
    }
  }

  file = findFile('server/views/index.js')
  if (file) {
    links.push({ icon: 'code', text: 'Views', href: '#server/views/index.js' })
  }

  return links
}

function close (e, item) {
  e.stopPropagation()
  var session = item.getSession()
  if (!session) {
    recent.remove(item.ref)
  } else {
    var file = session.file
    var dirty = item.isDirty()

    if (dirty) {
      if (window.confirm('There are unsaved changes to ' +
        file.name + '. Save changes?')) {
        session.save(function (err, data) {
          if (!err) {
            recent.remove(file.getRelativePath())
            sessions.remove(session)
          }
        })
      }
    } else {
      recent.remove(file.getRelativePath())
      sessions.remove(session)
    }
  }
}

function save (e, item) {
  e.stopPropagation()
  item.getSession().save()
  editor.focus()
}

function closeAll (e) {
  e.stopPropagation()

  var dirty = recent.dirty()
  if (dirty.length && window.confirm('There are unsaved changes to ' +
    dirty.length + ' file' + (dirty.length > 1 ? 's' : '') + '. Save changes?')) {
    sessions.saveAll()
  }
  recent.clear()
  sessions.clear()
}

function saveAll (e) {
  e.stopPropagation()
  sessions.saveAll()
  editor.focus()
}

var schema = {
  name: String,
  recent: Object,
  query: String,
  getLinks: getLinks,
  searchFiles: searchFiles,
  close: close,
  save: save,
  closeAll: closeAll,
  saveAll: saveAll
}

var Controller = supermodels(schema)
var ctrl = new Controller({
  query: '',
  recent: recent,
  name: path.basename(window.UCO.path)
})

module.exports = ctrl
