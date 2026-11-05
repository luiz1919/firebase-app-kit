import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { deleteApp, initializeApp } from 'firebase/app'
import { Bytes, doc, getFirestore } from 'firebase/firestore'
import type { DocumentReference, WriteBatch } from 'firebase/firestore'
import { joinChunks, stageChunkedFile, stageChunkedFileDelete } from '../src/chunks.ts'
import { CHUNK_BYTES } from '../src/utils/files.ts'

// Solo se crean referencias: no hay conexion con Firebase.
const app = initializeApp({ projectId: 'demo-firebase-app-kit', apiKey: 'test', appId: 'test' }, 'chunks-test')
const db = getFirestore(app)
after(() => deleteApp(app))

type Write = { op: 'set' | 'delete'; path: string; data?: Record<string, unknown> }

function recordingBatch() {
  const writes: Write[] = []
  const batch = {
    set: (ref: DocumentReference, data: Record<string, unknown>) => { writes.push({ op: 'set', path: ref.path, data }); return batch },
    delete: (ref: DocumentReference) => { writes.push({ op: 'delete', path: ref.path }); return batch },
  }
  return { batch: batch as unknown as WriteBatch, writes }
}

const bytesOf = (size: number) => Uint8Array.from({ length: size }, (_, index) => index % 251)

test('stageChunkedFile guarda la ficha y los trozos con el formato de las apps', () => {
  const { batch, writes } = recordingBatch()
  const bytes = bytesOf(2 * CHUNK_BYTES + 10)
  const metadata = { recordId: 'r1', name: 'acta.pdf', size: bytes.length, type: 'application/pdf', chunkCount: 3 }
  stageChunkedFile(batch, doc(db, 'users', 'u1', 'attachments', 'a1'), bytes, metadata)

  assert.deepEqual(writes.map(({ op, path }) => `${op} ${path}`), [
    'set users/u1/attachments/a1',
    'set users/u1/attachments/a1/chunks/0000',
    'set users/u1/attachments/a1/chunks/0001',
    'set users/u1/attachments/a1/chunks/0002',
  ])
  assert.deepEqual(writes[0].data, metadata)
  for (const [position, write] of writes.slice(1).entries()) {
    assert.deepEqual(Object.keys(write.data ?? {}), ['index', 'data'])
    assert.equal(write.data?.index, position)
    assert.ok(write.data?.data instanceof Bytes)
  }
  assert.deepEqual(writes.map((write) => (write.data?.data as Bytes | undefined)?.toUint8Array().length), [undefined, CHUNK_BYTES, CHUNK_BYTES, 10])
})

test('stageChunkedFile rechaza una ficha con chunkCount equivocado y no escribe nada', () => {
  const { batch, writes } = recordingBatch()
  assert.throws(() => stageChunkedFile(batch, doc(db, 'users/u1/trips/t1/attachments/a1'), bytesOf(10), { chunkCount: 2 }), /chunkCount/)
  assert.equal(writes.length, 0)
})

test('stageChunkedFileDelete borra los trozos y la ficha', () => {
  const { batch, writes } = recordingBatch()
  stageChunkedFileDelete(batch, doc(db, 'users/u1/trips/t1/attachments/a1'), 2)
  assert.deepEqual(writes.map(({ op, path }) => `${op} ${path}`), [
    'delete users/u1/trips/t1/attachments/a1/chunks/0000',
    'delete users/u1/trips/t1/attachments/a1/chunks/0001',
    'delete users/u1/trips/t1/attachments/a1',
  ])
})

test('joinChunks recupera los bytes guardados, en cualquier orden', () => {
  const { batch, writes } = recordingBatch()
  const bytes = bytesOf(CHUNK_BYTES + 123)
  stageChunkedFile(batch, doc(db, 'users/u1/attachments/a1'), bytes, {})
  const chunks = writes.slice(1).map((write) => write.data).reverse()
  const info = { size: bytes.length, chunkCount: 2 }
  assert.deepEqual(joinChunks(chunks, info), bytes)
  // Un trozo sobrante (de una version anterior) no estorba.
  assert.deepEqual(joinChunks([...chunks, { index: 2, data: Bytes.fromUint8Array(bytesOf(5)) }], info), bytes)
})

test('joinChunks devuelve null si los trozos no cuadran con la ficha', () => {
  const part = (index: number, size: number) => ({ index, data: Bytes.fromUint8Array(bytesOf(size)) })
  assert.equal(joinChunks([part(0, 10)], { size: 10, chunkCount: 2 }), null)
  assert.equal(joinChunks([part(0, 10), part(0, 5)], { size: 15, chunkCount: 2 }), null)
  assert.equal(joinChunks([part(0, 10)], { size: 11, chunkCount: 1 }), null)
  assert.equal(joinChunks([{ index: 0, data: bytesOf(10) }], { size: 10, chunkCount: 1 }), null)
  assert.equal(joinChunks([part(0, 0)], { size: 0, chunkCount: 1 }), null)
  assert.equal(joinChunks([part(0, CHUNK_BYTES + 1)], { size: CHUNK_BYTES + 1, chunkCount: 1 }), null)
  assert.deepEqual(joinChunks([part(0, 10)], { size: 10, chunkCount: 1 }), bytesOf(10))
})
