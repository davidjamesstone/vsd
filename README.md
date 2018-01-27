# vsd

`visdev` is a web-based development environment built using Node.js.
It can be used to edit any text content but it is designed specifically to build [hapi.js](http://hapijs.com) web applications and services.

It encourages using configuration, conventions and metadata to build and test robust [node.js](https://nodejs.org/) applications.

Checkout out a live demo [here](https://visual-dev.herokuapp.com/?path=/app/docs/demo)

An example [Todo List](https://github.com/davidjamesstone/vsd-example-todo) can be viewed live [here](https://visual-dev.herokuapp.com/?path=/app/docs/vsd-example-todo)

## Install
`npm i -g vsd`

## CLI
```
Options:

  -h, --help          Show help
  -p, --port          Port number (3002)
  -s, --server        Host ip address (127.0.0.1)
  -c, --create        Name of new project to create
  -t, --type          New project type (vsd-web) [vsd-web, api, web, gov]
  -b, --tabsize       Tab size (2)
  -f, --fontsize      Font size (12)
  -m, --theme         Editor theme
  -d, --hardtabs      Use hard tabs (false)
```

## Quick start

Scaffold a new vsd project

`vsd -c myapp`

Start `vsd` and open the link below in your browser.
`vsd` uses port 3000 by default. 
Replace `<my-dir>` with the path where you created the project. 

`http://localhost:3000/?path=/<my-dir>/myapp`

Read the [wiki](https://github.com/davidjamesstone/vsd/wiki) docs for more info.

## Features

`vsd`’s current features:

- File explorer tree view
- Autosave
- File operations (create/delete/rename files and directories etc.)
- Syntax highlighted code editing for many programming languages
- Find/Find+Replace
- [standardjs](standardjs.com) validation warnings and code formatting
- Emmet
- Code snippets
- Themeable
- DB Schema Designer
- Routing table Designer


## Meta

There are two special files names `vsd` looks for. 

Files with the name ending in `db.json` are data models that are edited with a custom database designer UI.
These can be used to generate [mongoosejs](http://mongoosejs.com/) models.

Checkout out a live demo [here](https://visual-dev.herokuapp.com/?path=/app/docs/demo#db/db.json)



Files with the name ending in `routes.json` are data models that are edited with a custom route table designer UI.
These can be used to generate `hapi` routes.

Checkout out a live demo [here](https://visual-dev.herokuapp.com/?path=/app/docs/demo#server/routes/routes.json)

![alt](http://davidjamesstone.github.io/vsd/1.png)

![alt](http://davidjamesstone.github.io/vsd/2.png)

![alt](http://davidjamesstone.github.io/vsd/3.png)

![alt](http://davidjamesstone.github.io/vsd/4.png)

![alt](http://davidjamesstone.github.io/vsd/5.png)

## Built using

- [Node.js](https://github.com/joyent/node)
- [ace editor](https://github.com/ajaxorg/ace)
- [Twitter Bootstrap](https://github.com/twbs/bootstrap)
- [AdminLTE](https://almsaeedstudio.com/themes/AdminLTE/index2.html)
- [superviews.js](https://github.com/davidjamesstone/superviews.js)
- [incremental-dom](http://google.github.io/incremental-dom)
- [Browserify](https://github.com/substack/node-browserify)
- [hapi](https://github.com/hapijs/hapi)
- [nes](https://github.com/hapijs/nes)

*** WARNING ***:
================
If you'd like to try out this editor that's great BUT PLEASE USE CAUTION.

Ensure any code is backed up regularly.
I would not like it to be responsible for any work lost.

Also, there is no authentication or security built in. That is left to you. Do not run on a publicly accessible server/port.

License
=======

vsd is released under a **MIT License**:

Copyright (C) 2015-2018 by David Stone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
