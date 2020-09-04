// Import
import { equal } from 'assert-helpers'
import kava from 'kava'
import * as getter from './index.js'
import { StrictUnion } from 'simplytyped'

type Errback = (error?: Error) => void

function long(result: StrictUnion<Set<getter.Fellow> | Array<getter.Fellow>>) {
	const size = result.size || result.length || 0
	equal(size > 0, true, `more than one result, it had ${size}`)
}

function check(done: Errback, log: boolean = false) {
	return function (result: any) {
		if (log) console.log(result)
		long(result)
		setImmediate(done)
	}
}

// Test
kava.suite('getmembers', function (suite, test) {
	test('orgs', function (done) {
		getter
			.getMembersFromOrgs(['browserstate', 'interconnectapp'])
			.then(check(done))
			.catch(done)
	})
})
