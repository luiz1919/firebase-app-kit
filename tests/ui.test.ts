import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isBackdropClick } from '../src/ui/useModalDialog.ts'

test('only a click outside the dialog box counts as a tap on the backdrop', () => {
  const box = { left: 20, right: 370, top: 300, bottom: 500 }
  assert.equal(isBackdropClick(box, 10, 400), true)
  assert.equal(isBackdropClick(box, 380, 400), true)
  assert.equal(isBackdropClick(box, 200, 290), true)
  assert.equal(isBackdropClick(box, 200, 510), true)
  // The dialog's own padding: the target is the dialog too, but it is inside.
  assert.equal(isBackdropClick(box, 25, 305), false)
  assert.equal(isBackdropClick(box, 200, 400), false)
})
