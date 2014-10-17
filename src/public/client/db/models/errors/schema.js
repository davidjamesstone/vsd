function SchemaError(schema, message) {
  this.schema = schema;
  this.message = message;
}

module.exports = SchemaError;
