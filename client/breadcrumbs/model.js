function Model (crumbs, icon) {
  this.crumbs = crumbs || []
  this.icon = icon
}
Model.prototype.isFirst = function (crumb) {
  return !!(this.crumbs.length && crumb === this.crumbs[0])
}
Model.prototype.isLast = function (crumb) {
  return !!(this.crumbs.length && crumb === this.crumbs[this.crumbs.length - 1])
}

module.exports = Model
