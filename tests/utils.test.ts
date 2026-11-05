import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SYNC_LABELS, authErrorMessage, completeEmailDomain, formatDate, hasEmailDomain, todayIso } from '../src/utils/index.ts'

test('hasEmailDomain reconoce un correo con dominio', () => {
  assert.equal(hasEmailDomain('ana@gmail.com'), true)
  assert.equal(hasEmailDomain('ana@gmail'), false)
  assert.equal(hasEmailDomain('ana'), false)
  assert.equal(hasEmailDomain('ana@'), false)
})

test('completeEmailDomain sustituye lo que hay tras la @', () => {
  assert.equal(completeEmailDomain(' ana ', 'gmail.com'), 'ana@gmail.com')
  assert.equal(completeEmailDomain('ana@hotm', 'hotmail.com'), 'ana@hotmail.com')
  assert.equal(completeEmailDomain('', 'icloud.com'), '@icloud.com')
})

test('authErrorMessage traduce los codigos de Firebase Auth', () => {
  assert.equal(authErrorMessage({ code: 'auth/invalid-credential' }), 'Correo o contraseña incorrectos.')
  assert.equal(authErrorMessage({ code: 'auth/invalid-login-credentials' }), 'Correo o contraseña incorrectos.')
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /Sin conexi/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }), /Demasiados intentos/)
  assert.match(authErrorMessage(new Error('x')), /No se ha podido iniciar sesi/)
  assert.match(authErrorMessage(null), /No se ha podido iniciar sesi/)
})

test('formatDate no se desplaza de dia y todayIso usa la fecha local', () => {
  assert.equal(formatDate('2026-11-05'), '5 nov 2026')
  assert.equal(formatDate('2026-01-01'), '1 ene 2026')
  const now = new Date()
  assert.equal(todayIso(), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
})

test('hay etiqueta para cada estado de sincronizacion', () => {
  assert.deepEqual(Object.keys(SYNC_LABELS).sort(), ['error', 'offline', 'synced', 'syncing'])
})
