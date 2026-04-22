export function formatDate(value, raw = false) {
  if (!value) {
    return '-'
  }

  const date = typeof value === 'string' ? new Date(value.replace(' ', 'T')) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return raw ? '' : value
  }

  const pad = (num) => String(num).padStart(2, '0')
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return raw ? text : text
}

export function nowDateString() {
  return formatDate(new Date(), true)
}

export function toInputDateTime(value) {
  if (!value) {
    return ''
  }

  const text = typeof value === 'string' ? value.replace(' ', 'T') : formatDate(value, true).replace(' ', 'T')
  return text.slice(0, 16)
}

export function toBackendDateTime(value) {
  if (!value) {
    return null
  }

  return `${value.replace('T', ' ')}:00`
}
