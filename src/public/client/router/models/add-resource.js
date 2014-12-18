var Route = require('vsd-router-model').Route;
var en = require('lingo').en;
/*
 * AddResource Constructor Function.
 * AddResource model used to hold 'Add-Resource' state
 */
var AddResource = function(name, parent) {
  this.name = name;
  this.parent = parent;

  this._route = new Route({
    parent: parent,
    path: '/' + this.name,
    description: 'Resource controller to access...'
  });

  // var indexHandler = controller.addHandler({
  //   name: 'index'
  // });

  // var newHandler = controller.addHandler({
  //   name: 'new'
  // });

  // var createHandler = controller.addHandler({
  //   name: 'create'
  // });

  // var showHandler = controller.addHandler({
  //   name: 'show'
  // });

  // var editHandler = controller.addHandler({
  //   name: 'edit'
  // });

  // var updateHandler = controller.addHandler({
  //   name: 'update'
  // });

  // var destroyHandler = controller.addHandler({
  //   name: 'destroy'
  // });


  // GET     /forums              ->  index
  // GET     /forums/new          ->  new
  // POST    /forums              ->  create
  // GET     /forums/:forum       ->  show
  // GET     /forums/:forum/edit  ->  edit
  // PUT     /forums/:forum       ->  update
  // DELETE  /forums/:forum       ->  destroy

    var root = this._route;

    root.addAction('GET', []);
    root.addAction('POST', []);

    var newRoute = root.addChild('/new');
    newRoute.addAction('GET', []);

    var itemRoute = root.addChild('/:' + en.singularize(this.name));
    itemRoute.addAction('GET', []);
    itemRoute.addAction('PUT', []);
    itemRoute.addAction('DELETE', []);

    var itemEditRoute = itemRoute.addChild('/edit');
    itemEditRoute.addAction('GET', []);

    this._itemRoute = itemRoute;
};
Object.defineProperties(AddResource.prototype, {
  url: {
    get: function() {
      return this.parent.url + '/' + this.name;
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
