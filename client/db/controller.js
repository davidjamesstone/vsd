var supermodels = require('supermodels.js')
var Model = require('./model')
var prop = require('../prop')
var staticTypes = 'String Boolean Number Date Array Mixed NestedDocument ForeignKey ObjectId Buffer ChildDocument'.split(' ')

var schema = {
  id: prop(String).required().uuid(),
  expandedItems: [],
  model: Model,
  get schemas () {
    return this.model.schemas
  },
  currentItem: Object,
  get breadcrumbs () {
    var currentItem = this.currentItem
    var breadcrumbs = [{ text: this.model.name, item: this.model }]

    if (currentItem) {
      if (currentItem.isSchema) {
        breadcrumbs.push({ text: currentItem.name, item: currentItem })
      } else if (currentItem.isKey) {
        breadcrumbs = breadcrumbs.concat(currentItem.getBreadcrumb().map(function (item) {
          return {
            item: item,
            text: item.name
          }
        }))
      }
    }

    return breadcrumbs
  },
  isExpanded: function (item) {
    return ~this.expandedItems.indexOf(item)
  },
  onClickTreeNode: function (item) {
    if (item.isSchema || (item.isKey && item.isNested)) {
      if (!this.isExpanded(item)) {
        this.expandedItems.push(item)
      }
    }
    this.currentItem = item
  },
  isGraphExpanded: prop(Boolean).value(false),
  onClickToggleNode: function (item) {
    var idx = this.expandedItems.indexOf(item)
    if (idx === -1) {
      this.expandedItems.push(item)
    } else {
      this.expandedItems.splice(idx, 1)
    }
  },
  onClickErrorNode: function (item) {
    var node
    if (item.target.isModel || item.target.isSchema || item.target.isKey) {
      node = item.target
    } else {
      // Must be a def - look up its key
      node = item.target.__ancestors.find(function (item) {
        return item.isKey
      })
    }
    this.onClickTreeNode(node)
  },
  get staticTypes () {
    return staticTypes
  },
  validateSchemaName: function (name, ignoreSchema) {
    if (!name) {
      return 'Name cannot be blank. Please supply a name.'
    }

    var dupes = this.schemas.find(this.schemas, function (s) {
      return s !== ignoreSchema && s.name.toLowerCase() === name.toLowerCase()
    })

    return dupes ? 'Duplicate Schema name. Please supply a unique name.' : true
  },
  childSchemas: function () {
    return this.schemas.filter(function (schema) {
      return schema.isVirtual
    })
  },
  parentSchemas: function () {
    return this.schemas.filter(function (schema) {
      return !schema.isVirtual
    })
  },
  availableDocumentRefs: function () {
    return this.parentSchemas().map(function (schema) {
      return {
        id: schema.id,
        name: schema.name
      }
    })
  },
  availableChildDocumentRefs: function () {
    return this.childSchemas().map(function (schema) {
      return {
        id: schema.id,
        name: schema.name
      }
    })
  },
  keyAsString: function (key) {
    var names = {}
    this.availableDocumentRefs().forEach(function (item) {
      names[item.id] = item.name
    })
    this.availableChildDocumentRefs().forEach(function (item) {
      names[item.id] = item.name
    })

    var def = key.def
    var t = key.type
    if (t === 'Array') {
      var ofT = def.oftype
      if (ofT === 'ForeignKey') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]'
      } else if (ofT === 'ChildDocument') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]'
      } else {
        return '[' + ofT + ']'
      }
    } else if (t === 'ForeignKey' || t === 'ChildDocument') {
      return t + '<' + names[def.ref] + '>'
    } else {
      return t
    }
  }
}

module.exports = supermodels(schema)
