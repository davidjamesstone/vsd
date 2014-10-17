var Controller = require('./controller');
var Route = require('./route');
var en = require('lingo').en;
/*
 * AddResource Constructor Function.
 * AddResource model used to hold 'Add-Resource' state
 */

var AddResource = function(name, parent) {
  this.name = name;
  this.parent = parent;
  this._controller = new Controller({
    name: this.name
  });
  this._route = new Route({
    parent: parent,
    path: '/' + this.name,
    description: 'Resource controller to access...'
  });

  var controller = this._controller;

  var indexHandler = controller.addHandler({
    name: 'index'
  });

  var newHandler = controller.addHandler({
    name: 'new'
  });

  var createHandler = controller.addHandler({
    name: 'create'
  });

  var showHandler = controller.addHandler({
    name: 'show'
  });

  var editHandler = controller.addHandler({
    name: 'edit'
  });

  var updateHandler = controller.addHandler({
    name: 'update'
  });

  var destroyHandler = controller.addHandler({
    name: 'destroy'
  });


  // GET     /forums              ->  index
  // GET     /forums/new          ->  new
  // POST    /forums              ->  create
  // GET     /forums/:forum       ->  show
  // GET     /forums/:forum/edit  ->  edit
  // PUT     /forums/:forum       ->  update
  // DELETE  /forums/:forum       ->  destroy

    var root = this._route;

    root.addAction('GET', [indexHandler]);
    root.addAction('POST', [createHandler]);

    var newRoute = root.addChild('/new');
    newRoute.addAction('GET', [newHandler]);

    var itemRoute = root.addChild('/:' + en.singularize(this.name));
    itemRoute.addAction('GET', [showHandler]);
    itemRoute.addAction('PUT', [updateHandler]);
    itemRoute.addAction('DELETE', [destroyHandler]);

    var itemEditRoute = itemRoute.addChild('/edit');
    itemEditRoute.addAction('GET', [editHandler]);

    this._itemRoute = itemRoute;
};
Object.defineProperties(AddResource.prototype, {
  url: {
    get: function() {
      return this.parent.url + '/' + this.name;
    }
  },
  controller: {
    get: function() {

      var controller = this._controller;

      controller.name = this.name;

      return controller;
    }
  },
  route: {
    get: function() {

      var route = this._route;
      var itemRoute = this._itemRoute;

      route.path = '/' + this.name;
      itemRoute.path = '/:' + en.singularize(this.name);

      return route;
    }
  },
  actions: {
    get: function() {

      var route = this.route;
      var actions = [].concat(route.actions);

      route.descendants.forEach(function(item) {
        Array.prototype.push.apply(actions, item.actions);
      });

      return actions;
    }
  }
});


module.exports = AddResource;
