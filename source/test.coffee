# Import
{equal, nullish} = require('assert-helpers')
kava = require('kava')
Getter = require('./')

# Test
kava.suite 'getmembers', (suite,test) ->
	getter = null

	# Create our contributors instance
	test 'create', ->
		getter = Getter.create()

	# Fetch all the contributors on these github
	suite 'members', (suite,test) ->
		test 'fetch', (done) ->
			getter.fetchMembersFromOrgs ['browserstate', 'interconnectapp'], (err) ->
				nullish(err)
				return done()

		test 'combined result', ->
			result = getter.getMembers()
			equal(Array.isArray(result), true, 'is array')
			equal(result.length > 0, true, 'have positive length')
