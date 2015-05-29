visdev
====

`visdev`is a web-based code editor built using Node.js.

Screenshots
===========

![ide](https://s3-eu-west-1.amazonaws.com/djs-files/Screen+Shot+2015-03-11+at+20.02.58.png "File System Editor Features")

![ide](https://s3-eu-west-1.amazonaws.com/djs-files/Screen+Shot+2015-03-11+at+20.08.46.png "Project Dashboard")


Instructions
=====

npm install -g vsd

Then `cd` into the directory you want to view and execute: 

`vsd`

The default port is 3000. To change this use the command

`PORT=XXXX vsd`

*** WARNING ***:
================
If you'd like to try out this editor that's great BUT PLEASE USE CAUTION.

Ensure any code is backed up regularly.
I would not like it to be responsible for any work lost.

Also, there is no authentication or security built in. That is left to you. Do not run on a publicly accessible server/port.


Features
========

`visdev`’s current features:

- File explorer tree & finder-style view
- File operations (create/delete/rename files and directories etc.)
- Syntax highlighted code editing for many programming languages
- HTML/CSS/JS beautifiers
- Find/Find+Replace
- JSLINT validation warning
- Emmet
- Code snippets
- DB Schema Designer

There are two special folder names `vsd` looks for:

# Database Models

Create any folder with the name ending in `.db` and `vsd` will treat this as a database directory.
Any `.json` file contained within will be assumed to be a database model definition.
`vsd` will then present a visual GUI db designer. While the designer is modelled heavily on
functionality available in `mongoose`, the model created is abstracted and could be used to
create db schema to generate databases than mongo.

The npm package [vsd-db-mongoose](https://www.npmjs.com/package/vsd-db-mongoose) converts
the `.json` to mongoose schema that can then be used. This is currently the only generator
available.

There are several demo models contained in the `test` directory. Here's some screenshots:

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db.png)

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db1.png)

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db2.png)

You can create some neat visualizations of the schema:

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db3.png)

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db4.png)



Built using:
============

- [Node.js](https://github.com/joyent/node)
- [ace editor](https://github.com/ajaxorg/ace)
- [Twitter Bootstrap](https://github.com/twbs/bootstrap)
- [Angular](https://github.com/angular/angular.js)
- [Browserify](https://github.com/substack/node-browserify)
- [socket.io](https://github.com/LearnBoost/socket.io)

License
=======

visdev is released under a **MIT License**:

    Copyright (C) 2015 by David Stone

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
