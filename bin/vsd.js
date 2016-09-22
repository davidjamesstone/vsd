#!/usr/bin/env node

var cli = require('../config/cli')

if (cli.args.h) {
  // Show cli help

  cli.showHelp()
} else if (cli.args.c) {
  // Scaffold a new project

  cli.createProject(cli.args.c, cli.args.t)
} else {
  // Start the program

  require('../')
}
