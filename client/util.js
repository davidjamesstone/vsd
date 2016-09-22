var notify = document.querySelector('vsd-notify')

function handleError (err) {
  console.error(err)
  notify.show('ban', 'danger', 'Something bad happened', err.toString())
}

function info (message, title) {
  title = title || 'Info'
  console.info(title, message)
  notify.show('info', 'info', title, message)
}

module.exports = {
  info: info,
  handleError: handleError
}
