module.exports = [{
  paths: ['client/**/*.js', 'client/**/*.html', 'client/**/*.json'],
  on: {
    all: ['npm run build:js']
  }
}, {
  paths: ['client/**/*.scss'],
  on: {
    all: ['npm run build:css']
  }
}]
