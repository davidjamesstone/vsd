This test folder contains some work in progress demos for some GUI editors. 

There are two special folder names `vsd` looks for:

Database Models
===============

Create any folder with the name ending in `.db` and `vsd` will treat this as a database directory.
Any `.json` file contained within will be assumed to be a database model definition.
`vsd` will then present a visual GUI db designer. While the designer is modelled heavily on
functionality available in `mongoose`, the model created is abstracted and could be used to
create db schema to generate databases than mongo.

The npm package [vsd-db-mongoose](https://www.npmjs.com/package/vsd-db-mongoose) converts
the `.json` to mongoose schema that can then be used. This is currently the only generator
available.

![alt](https://raw.githubusercontent.com/davidjamesstone/vsd/gh-pages/images/db.png)



 will  and  building a HTTP routing table