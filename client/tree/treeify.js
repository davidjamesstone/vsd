function makeTree (files) {
  function treeify (list, idAttr, parentAttr, childrenAttr) {
    var treeList = []
    var lookup = {}
    var i, obj, node, parent

    for (i = 0; i < list.length; i++) {
      obj = {
        name: list[i].name,
        path: list[i].path,
        fso: list[i]
      }

      lookup[obj.fso[idAttr]] = obj
      if (obj.fso.isDirectory) {
        obj[childrenAttr] = []
      }
    }

    for (i = 0; i < list.length; i++) {
      obj = list[i]
      node = lookup[obj[idAttr]]
      parent = lookup[obj[parentAttr]]
      if (parent) {
        node.parent = parent
        parent[childrenAttr].push(node)
      } else {
        treeList.push(node)
      }
    }

    return treeList
  }
  return treeify(files, 'path', 'dir', 'children')
}

module.exports = makeTree
