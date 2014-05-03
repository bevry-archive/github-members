# Import
{expect} = require('chai')
joe = require('joe')

# Test
joe.suite 'getmembers', (suite,test) ->
	getter = null

	# Create our contributors instance
	test 'create', ->
		getter = require('../../').create(
			#log: console.log
		)

	# Fetch all the contributors on these github
	suite 'members', (suite,test) ->
		test 'fetch', (done) ->
			getter.fetchMembersFromOrgs ['browserstate', 'interconnectapp'], (err) ->
				expect(err).to.be.null
				return done()

		test 'combined result', ->
			result = getter.getMembers()
			console.log result
			expect(result).to.be.an('array')
			expect(result.length).to.not.equal(0)
