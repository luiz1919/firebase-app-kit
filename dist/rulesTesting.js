// Firestore rules tests of the kit's blocks (rules/*.rules), to run in each app against its own
// firestore.rules, in its emulator (npm run test:rules). The app passes its test environment and
// the assertions of @firebase/rules-unit-testing, which the kit does not depend on:
//
//   import { feedbackRulesTests } from 'firebase-app-kit/rules-testing'
//   feedbackRulesTests({ environment: () => environment, assertSucceeds, assertFails, rules })
//
// Each test starts by clearing the emulator's database. The client side is the kit's own
// feedback functions, so these tests also prove that what the app writes is allowed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Bytes, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, } from 'firebase/firestore';
import { deleteFeedback, editFeedback, manageFeedback, markFeedbackReplyRead, readFeedbackDiagnostics, readFeedbackScreenshots, submitFeedback, } from './feedback.js';
import { outdatedRulesSnippets } from './rules.js';
import { feedbackFromData } from './utils/feedback.js';
const ALICE = 'feedback-alice';
const BOB = 'feedback-bob';
const ADMIN = 'feedback-admin';
const emailOf = (uid) => `${uid}@example.com`;
const withoutField = (data, field) => Object.fromEntries(Object.entries(data).filter(([key]) => key !== field));
/** Registers the feedback rules tests (node:test). */
export function feedbackRulesTests({ environment, assertSucceeds, assertFails, rules }) {
    const as = (uid) => environment().authenticatedContext(uid, { email: emailOf(uid) }).firestore();
    const signedOut = () => environment().unauthenticatedContext().firestore();
    const withoutRules = (callback) => environment().withSecurityRulesDisabled(async (context) => { await callback(context.firestore()); });
    const seedAdmin = () => withoutRules((db) => setDoc(doc(db, 'admins', ADMIN), { note: 'rules test' }));
    const fresh = () => environment().clearFirestore();
    const jpeg = (size) => ({ bytes: Uint8Array.from({ length: size }, (_, index) => (index < 3 ? [0xff, 0xd8, 0xff][index] : index % 251)), width: 30, height: 60 });
    const diagnostics = { context: { version: '1.2.3', route: '#/', online: true }, errors: [{ at: '2026-11-09T10:00:00.000Z', message: 'TypeError: x is undefined' }] };
    const draft = (overrides = {}) => ({ kind: 'bug', text: 'La lista no se guarda', screenshots: [], diagnostics: null, ...overrides });
    async function send(uid, overrides = {}) {
        const { id, committed } = submitFeedback(as(uid), { uid, email: emailOf(uid) }, draft(overrides), '1.2.3');
        await assertSucceeds(committed);
        return id;
    }
    async function itemAs(uid, id) {
        const snapshot = await getDoc(doc(as(uid), 'feedback', id));
        return feedbackFromData(id, snapshot.data() ?? {});
    }
    const newFeedback = (uid, overrides = {}) => ({
        kind: 'idea', text: 'Modo oscuro', status: 'new', createdBy: uid, createdByEmail: emailOf(uid), createdAt: serverTimestamp(),
        editedAt: null, appVersion: '1.2.3', screenshotCount: 0, hasDiagnostics: false, reply: '', repliedAt: null, replyRead: true,
        resolvedVersion: '', ...overrides,
    });
    if (rules !== undefined) {
        test('feedback rules: firestore.rules carries the current block of firebase-app-kit', () => {
            assert.match(rules, /\/\/ <firebase-app-kit:feedback>/, 'Add it with: npx firebase-app-kit rules feedback');
            assert.deepEqual(outdatedRulesSnippets(rules), [], 'Update it with: npx firebase-app-kit rules');
        });
    }
    test('feedback rules: a user sends feedback with screenshots and technical details in one batch', async () => {
        await fresh();
        const id = await send(ALICE, { screenshots: [jpeg(1200), jpeg(800), jpeg(10)], diagnostics });
        const db = as(ALICE);
        const saved = await itemAs(ALICE, id);
        assert.equal(saved.status, 'new');
        assert.equal(saved.createdBy, ALICE);
        assert.equal(saved.createdByEmail, emailOf(ALICE));
        assert.equal(saved.screenshotCount, 3);
        assert.ok(saved.createdAt instanceof Date);
        const shots = await assertSucceeds(readFeedbackScreenshots(db, saved));
        assert.deepEqual(shots.map((blob) => blob.size), [1200, 800, 10]);
        assert.deepEqual(await assertSucceeds(readFeedbackDiagnostics(db, id)), diagnostics);
    });
    test('feedback rules: every signed-in user reads the feedback; signed-out visitors cannot', async () => {
        await fresh();
        await seedAdmin();
        const id = await send(ALICE);
        await assertSucceeds(getDoc(doc(as(BOB), 'feedback', id)));
        await assertSucceeds(getDocs(query(collection(as(BOB), 'feedback'), orderBy('createdAt', 'desc'), limit(300))));
        // The queries behind the count on the feedback icon.
        await assertSucceeds(getDocs(query(collection(as(ALICE), 'feedback'), where('createdBy', '==', ALICE), where('replyRead', '==', false))));
        await assertSucceeds(getDocs(query(collection(as(ADMIN), 'feedback'), where('status', '==', 'new'))));
        await assertFails(getDoc(doc(signedOut(), 'feedback', id)));
        await assertFails(getDocs(collection(signedOut(), 'feedback')));
    });
    test('feedback rules: screenshots and technical details are for the author and admins only', async () => {
        await fresh();
        await seedAdmin();
        const id = await send(ALICE, { screenshots: [jpeg(100)], diagnostics });
        const bob = as(BOB);
        await assertFails(getDoc(doc(bob, `feedback/${id}/screenshots/0`)));
        await assertFails(getDocs(collection(bob, `feedback/${id}/screenshots`)));
        await assertFails(getDoc(doc(bob, `feedback/${id}/screenshots/0/chunks/0000`)));
        await assertFails(getDoc(doc(bob, `feedback/${id}/private/diagnostics`)));
        const admin = as(ADMIN);
        assert.equal((await assertSucceeds(readFeedbackScreenshots(admin, { id, screenshotCount: 1 }))).length, 1);
        assert.deepEqual(await assertSucceeds(readFeedbackDiagnostics(admin, id)), diagnostics);
    });
    test('feedback rules: new feedback must be well formed, unanswered and signed by its author', async () => {
        await fresh();
        const db = as(ALICE);
        const invalid = [
            newFeedback(BOB),
            newFeedback(ALICE, { createdByEmail: 'someone@example.com' }),
            newFeedback(ALICE, { status: 'done' }),
            newFeedback(ALICE, { reply: 'Hecho' }),
            newFeedback(ALICE, { replyRead: false }),
            newFeedback(ALICE, { resolvedVersion: '1.2.4' }),
            newFeedback(ALICE, { text: '' }),
            newFeedback(ALICE, { text: 'x'.repeat(4001) }),
            newFeedback(ALICE, { kind: 'question' }),
            newFeedback(ALICE, { createdAt: new Date(2020, 0, 1) }),
            newFeedback(ALICE, { editedAt: serverTimestamp() }),
            newFeedback(ALICE, { screenshotCount: 4 }),
            newFeedback(ALICE, { screenshotCount: -1 }),
            newFeedback(ALICE, { appVersion: 'x'.repeat(41) }),
            newFeedback(ALICE, { priority: 'high' }),
            withoutField(newFeedback(ALICE), 'editedAt'),
        ];
        for (const [index, data] of invalid.entries()) {
            await assertFails(setDoc(doc(db, 'feedback', `invalid-${index}`), data));
        }
        await assertFails(setDoc(doc(signedOut(), 'feedback', 'anonymous'), newFeedback('')));
        await assertSucceeds(setDoc(doc(db, 'feedback', 'valid'), newFeedback(ALICE)));
    });
    test('feedback rules: screenshots and technical details only travel with new feedback', async () => {
        await fresh();
        const db = as(ALICE);
        const shot = { index: 0, type: 'image/jpeg', size: 4, width: 10, height: 10, chunkCount: 1 };
        const chunk = { index: 0, data: Bytes.fromUint8Array(Uint8Array.of(0xff, 0xd8, 0xff, 0x00)) };
        // Added to existing feedback.
        const id = await send(ALICE);
        const later = writeBatch(db);
        later.set(doc(db, `feedback/${id}/screenshots/0`), shot);
        later.set(doc(db, `feedback/${id}/screenshots/0/chunks/0000`), chunk);
        await assertFails(later.commit());
        await assertFails(setDoc(doc(db, `feedback/${id}/private/diagnostics`), diagnostics));
        const attempt = async (feedback, writes) => {
            const batch = writeBatch(db);
            const parent = doc(collection(db, 'feedback'));
            batch.set(parent, newFeedback(ALICE, feedback));
            for (const [path, data] of writes)
                batch.set(doc(parent, path), data);
            return batch.commit();
        };
        const oneShot = { screenshotCount: 1 };
        await assertSucceeds(attempt(oneShot, [['screenshots/0', shot], ['screenshots/0/chunks/0000', chunk]]));
        await assertFails(attempt(oneShot, [['screenshots/1', { ...shot, index: 1 }], ['screenshots/1/chunks/0000', chunk]]));
        await assertFails(attempt(oneShot, [['screenshots/0', { ...shot, size: 5 }], ['screenshots/0/chunks/0000', chunk]]));
        await assertFails(attempt(oneShot, [['screenshots/0', { ...shot, type: 'image/png' }], ['screenshots/0/chunks/0000', chunk]]));
        await assertFails(attempt(oneShot, [['screenshots/0', shot], ['screenshots/0/chunks/0001', chunk]]));
        await assertFails(attempt(oneShot, [['screenshots/0', { ...shot, size: 800_000 }], ['screenshots/0/chunks/0000', chunk]]));
        await assertSucceeds(attempt({ hasDiagnostics: true }, [['private/diagnostics', diagnostics]]));
        await assertFails(attempt({ hasDiagnostics: false }, [['private/diagnostics', diagnostics]]));
        await assertFails(attempt({ hasDiagnostics: true }, [['private/other', diagnostics]]));
        await assertFails(attempt({ hasDiagnostics: true }, [['private/diagnostics', { ...diagnostics, email: 'x' }]]));
    });
    test('feedback rules: only the author edits the kind and the text', async () => {
        await fresh();
        await seedAdmin();
        const id = await send(ALICE);
        await assertSucceeds(editFeedback(as(ALICE), id, { kind: 'idea', text: 'Mejor: guardar la lista sin conexión' }));
        const saved = await itemAs(ALICE, id);
        assert.equal(saved.kind, 'idea');
        assert.ok(saved.editedAt instanceof Date);
        await assertFails(editFeedback(as(BOB), id, { kind: 'bug', text: 'Cambiado por otro' }));
        await assertFails(editFeedback(as(ADMIN), id, { kind: 'bug', text: 'Cambiado por el admin' }));
        const alice = doc(as(ALICE), 'feedback', id);
        await assertFails(updateDoc(alice, { text: 'Sin fecha de edición' }));
        await assertFails(updateDoc(alice, { text: '', editedAt: serverTimestamp() }));
        await assertFails(updateDoc(alice, { status: 'done' }));
        await assertFails(updateDoc(alice, { reply: 'Me respondo yo' }));
        await assertFails(updateDoc(alice, { createdBy: BOB }));
    });
    test('feedback rules: admins set the status, the reply and the version; the author marks the reply read', async () => {
        await fresh();
        await seedAdmin();
        const id = await send(ALICE);
        const item = await itemAs(ALICE, id);
        const done = { status: 'done', reply: 'Arreglado, gracias', resolvedVersion: '1.2.4' };
        await assertFails(manageFeedback(as(BOB), item, done, BOB));
        await assertFails(manageFeedback(as(ALICE), item, done, ALICE));
        await assertSucceeds(manageFeedback(as(ADMIN), item, done, ADMIN));
        const answered = await itemAs(ALICE, id);
        assert.equal(answered.status, 'done');
        assert.equal(answered.replyRead, false);
        assert.ok(answered.repliedAt instanceof Date);
        await assertFails(markFeedbackReplyRead(as(BOB), id));
        await assertSucceeds(markFeedbackReplyRead(as(ALICE), id));
        await assertFails(updateDoc(doc(as(ALICE), 'feedback', id), { replyRead: false }));
        const admin = doc(as(ADMIN), 'feedback', id);
        await assertFails(updateDoc(admin, { reply: 'Con fecha inventada', repliedAt: new Date(2020, 0, 1) }));
        await assertFails(updateDoc(admin, { status: 'closed' }));
        await assertFails(updateDoc(admin, { resolvedVersion: 'x'.repeat(41) }));
        await assertSucceeds(manageFeedback(as(ADMIN), await itemAs(ADMIN, id), { status: 'in-progress', reply: '', resolvedVersion: '' }, ADMIN));
        const cleared = await itemAs(ALICE, id);
        assert.deepEqual([cleared.status, cleared.reply, cleared.repliedAt, cleared.replyRead], ['in-progress', '', null, true]);
    });
    test('feedback rules: only admins delete feedback, with its screenshots and technical details', async () => {
        await fresh();
        await seedAdmin();
        const id = await send(ALICE, { screenshots: [jpeg(50), jpeg(60)], diagnostics });
        const item = await itemAs(ALICE, id);
        await assertFails(deleteFeedback(as(ALICE), item));
        await assertFails(deleteFeedback(as(BOB), item));
        await assertSucceeds(deleteFeedback(as(ADMIN), item));
        await withoutRules(async (db) => {
            for (const path of [`feedback/${id}`, `feedback/${id}/screenshots/0`, `feedback/${id}/screenshots/1/chunks/0000`, `feedback/${id}/private/diagnostics`]) {
                assert.equal((await getDoc(doc(db, path))).exists(), false, `${path} should be deleted`);
            }
        });
    });
    test('feedback rules: admins/{uid} is readable by its owner only and writable by nobody', async () => {
        await fresh();
        await seedAdmin();
        await assertSucceeds(getDoc(doc(as(ADMIN), 'admins', ADMIN)));
        await assertSucceeds(getDoc(doc(as(ALICE), 'admins', ALICE)));
        await assertFails(getDoc(doc(as(ALICE), 'admins', ADMIN)));
        await assertFails(getDocs(collection(as(ADMIN), 'admins')));
        await assertFails(setDoc(doc(as(ALICE), 'admins', ALICE), { note: 'me' }));
        await assertFails(updateDoc(doc(as(ADMIN), 'admins', ADMIN), { note: 'changed' }));
    });
}
