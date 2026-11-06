import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CHUNK_BYTES, SYNC_LABELS, authErrorMessage, canCompleteEmailDomain, chunkCountOf, completeEmailDomain, fileTypeOf, formatDate,
  hasEmailDomain, readFileBytes, todayIso,
} from '../src/utils/index.ts'

test('hasEmailDomain recognizes an email with a domain', () => {
  assert.equal(hasEmailDomain('ana@gmail.com'), true)
  assert.equal(hasEmailDomain('ana@gmail'), false)
  assert.equal(hasEmailDomain('ana'), false)
  assert.equal(hasEmailDomain('ana@'), false)
})

test('canCompleteEmailDomain requires a valid username before the @', () => {
  assert.equal(canCompleteEmailDomain(''), false)
  assert.equal(canCompleteEmailDomain('   '), false)
  assert.equal(canCompleteEmailDomain('@gmail.com'), false)
  assert.equal(canCompleteEmailDomain('ana luis'), false)
  assert.equal(canCompleteEmailDomain('añ'), false)
  assert.equal(canCompleteEmailDomain('a'), true)
  assert.equal(canCompleteEmailDomain(' ana.l+viajes_1 '), true)
  assert.equal(canCompleteEmailDomain('ana@hotm'), true)
})

test('completeEmailDomain replaces whatever follows the @', () => {
  assert.equal(completeEmailDomain(' ana ', 'gmail.com'), 'ana@gmail.com')
  assert.equal(completeEmailDomain('ana@hotm', 'hotmail.com'), 'ana@hotmail.com')
  assert.equal(completeEmailDomain('', 'icloud.com'), '@icloud.com')
})

test('authErrorMessage maps Firebase Auth codes to Spanish messages', () => {
  assert.equal(authErrorMessage({ code: 'auth/invalid-credential' }), 'Correo o contraseña incorrectos.')
  assert.equal(authErrorMessage({ code: 'auth/invalid-login-credentials' }), 'Correo o contraseña incorrectos.')
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /Sin conexi/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }), /Demasiados intentos/)
  assert.match(authErrorMessage(new Error('x')), /No se ha podido iniciar sesi/)
  assert.match(authErrorMessage(null), /No se ha podido iniciar sesi/)
})

test('formatDate does not shift the day and todayIso uses the local date', () => {
  assert.equal(formatDate('2026-11-05'), '5 nov 2026')
  assert.equal(formatDate('2026-01-01'), '1 ene 2026')
  const now = new Date()
  assert.equal(todayIso(), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
})

test('there is a label for every sync state', () => {
  assert.deepEqual(Object.keys(SYNC_LABELS).sort(), ['error', 'offline', 'synced', 'syncing'])
})

test('fileTypeOf recognizes PDF, JPEG and PNG by their content', () => {
  assert.equal(fileTypeOf(new TextEncoder().encode('%PDF-1.7')), 'application/pdf')
  assert.equal(fileTypeOf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg')
  assert.equal(fileTypeOf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(fileTypeOf(new TextEncoder().encode('%PDF')), null)
  assert.equal(fileTypeOf(new Uint8Array([1, 2, 3])), null)
})

test('chunkCountOf uses 750 KiB chunks and at least one', () => {
  assert.equal(CHUNK_BYTES, 768000)
  assert.equal(chunkCountOf(0), 1)
  assert.equal(chunkCountOf(CHUNK_BYTES), 1)
  assert.equal(chunkCountOf(CHUNK_BYTES + 1), 2)
  assert.equal(chunkCountOf(5 * 1024 * 1024), 7)
})

test('readFileBytes reads the file and fails with its name if it takes too long', async () => {
  assert.deepEqual(await readFileBytes(new File(['abc'], 'a.txt')), new TextEncoder().encode('abc'))
  const stuck = { name: 'stuck.pdf', arrayBuffer: () => new Promise<ArrayBuffer>(() => {}) } as unknown as File
  await assert.rejects(readFileBytes(stuck, 20), /«stuck\.pdf» \(TimeoutError\)/)
})
