const Bossy = require('bossy')
const path = require('path')
const spawn = require('child_process').spawn

const definition = {
  h: {
    description: 'Show help',
    alias: 'help',
    type: 'boolean'
  },
  p: {
    description: 'Port number (3002)',
    alias: 'port',
    type: 'number'
  },
  s: {
    description: 'Host ip address (127.0.0.1)',
    alias: 'server',
    type: 'string'
  },
  c: {
    description: 'Name of new project to create',
    alias: 'create',
    type: 'string'
  },
  t: {
    description: 'New project type (vsd-web) [vsd-web, api, web, gov]',
    alias: 'type',
    type: 'string'
  },
  b: {
    description: 'Tab size (2)',
    alias: 'tabsize',
    type: 'number'
  },
  f: {
    description: 'Font size (12)',
    alias: 'fontsize',
    type: 'number'
  },
  d: {
    description: 'Use hard tabs',
    alias: 'hardtabs',
    type: 'boolean'
  },
  m: {
    description: 'Editor theme',
    alias: 'theme',
    type: 'string'
  }
}

// Parse the command line args
const args = Bossy.parse(definition)

// Throw if arg errors
if (args instanceof Error) {
  throw args
}

function showHelp () {
  console.log(Bossy.usage(definition))
}

function createProject (name, type) {
  type = type || 'vsd-web'
  console.info('Creating new [' + type + '] project called ' + name)

  const file = path.resolve(__dirname, '../bin/glupe-scaffold.sh')
  spawn(file, [type, name], { stdio: 'inherit' })
}

module.exports = {
  args: args,
  showHelp: showHelp,
  createProject: createProject
}
