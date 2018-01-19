const Joi = require('joi')

const serverSchema = Joi.object().required().keys({
  host: Joi.string().hostname(),
  port: Joi.number().required(),
  labels: Joi.string()
})

module.exports = {
  server: serverSchema,
  logging: Joi.object().required(),
  views: Joi.object().required().keys({
    isCached: Joi.boolean().required()
  })
}
