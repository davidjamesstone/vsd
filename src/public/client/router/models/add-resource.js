var Route = require('vsd-router-model').Route;
var en = require('lingo').en;
/*
 * AddResource Constructor Function.
 * AddResource model used to hold 'Add-Resource' state
 */
var AddResource = function(name, parent) {
  this.name = name;
  this.parent = parent;
  this._location = null;

  this._route = new Route({
    parent: parent,
    path: '/' + this.name
  });

  // GET     /forums              ->  index
  // GET     /forums/new          ->  new
  // POST    /forums              ->  create
  // GET     /forums/:forum       ->  show
  // GET     /forums/:forum/edit  ->  edit
  // PUT     /forums/:forum       ->  update
  // DELETE  /forums/:forum       ->  destroy

    var root = this._route;

    root.addAction('GET', [{ location: '', name: 'index' }]);
    root.addAction('POST', [{ location: '', name: 'create' }]);

    var newRoute = root.addChild('/new');
    newRoute.addAction('GET', [{ location: '', name: 'new' }]);

    var itemRoute = root.addChild('/:' + en.singularize(this.name));
    itemRoute.addAction('GET', [{ location: '', name: 'show' }]);
    itemRoute.addAction('PUT', [{ location: '', name: 'update' }]);
    itemRoute.addAction('DELETE', [{ location: '', name: 'destroy' }]);

    var itemEditRoute = itemRoute.addChild('/edit');
    itemEditRoute.addAction('GET', [{ location: '', name: 'edit' }]);

    this._itemRoute = itemRoute;
};
Object.defineProperties(AddResource.prototype, {
  url: {
    get: function() {
      return this.parent.url + '/' + this.name;
    }
  },
  location: {
    get: function() {
      return this._location || './' + this.name;
    },
    set: function(value) {
      this._location = value;
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
