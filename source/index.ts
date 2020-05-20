# Import
typeChecker = require('typechecker')
extendr = require('extendr')
{TaskGroup} = require('taskgroup')
extractOptsAndCallback = require('extract-opts')
githubAuthQueryString = require('githubauthquerystring').fetch()
Feedr = require('feedr')
ghapi = process.env.GITHUB_API or 'https://api.github.com'

# Getter
class Getter
	# Members
	# Object listing of all the members, indexed by their lowercase username
	membersMap: null  # {}

	# Config
	config: null  # {}

	# Constructor
	# Create a new members instance
	constructor: (opts={}) ->
		# Prepare
		@membersMap ?= {}
		@config ?= opts

		# Feedr
		@feedr = new Feedr(@config)

		# Chain
		@

	# Log
	log: (args...) ->
		@config.log?(args...)
		@

	# Add a member to the internal listing and finish preparing it
	# member = {}
	# return {}
	addMember: (member) ->
		# Log
		@log 'debug', 'Adding the member:', member

		# Prepare
		memberData = @prepareMember(member)

		# We need a username
		return null  unless memberData.username

		# Find existing member
		memberData.id = memberData.username.toLowerCase()
		existingMemberData = @membersMap[memberData.id] ?= {}

		# Merge memberData into the existingMemberData
		extendr.deepDefaults(existingMemberData, memberData)

		# Update references in database
		@membersMap[memberData.id] = existingMemberData
		@membersMap[memberData.id].orgs ?= {}

		# Return
		return @membersMap[memberData.id]

	# Clone Member
	cloneMember: (member) ->
		# Clone
		memberData = extendr.deepDefaults({
			name: null
			email: null
			url: null
			username: null
			text: null
			orgs: null
		}, member)

		# Return
		return memberData

	# Prepare a member by setting and determing some defaults
	# member = {}
	# return {}
	prepareMember: (member) ->
		# Log
		@log 'debug', 'Preparing the member:', member

		# Prepare
		memberData = @cloneMember(member)

		# Extract username
		if memberData.url and memberData.username is null
			usernameMatch = /^.+?github.com\/([^\/]+).*$/.exec(memberData.url)
			if usernameMatch
				memberData.username = (usernameMatch[1] or '').trim() or null

		# Return
		return memberData

	# Prepare a member for return to the user, assume we have no more data, so determine the rest
	# memberData = {}
	# return {}
	prepareMemberFinale: (member) ->
		# Log
		@log 'debug', 'Preparing the member for the final time:', member

		# Prepare
		memberData = @cloneMember(member)

		# Fallbacks
		memberData.name or= memberData.username
		memberData.url  or= "https://github.com/#{memberData.username}"

		# Create text property
		memberData.text = []
		memberData.text.push(memberData.name)
		memberData.text.push("<#{memberData.email}>")  if memberData.email
		memberData.text.push("(#{memberData.url})")
		memberData.text = memberData.text.join(' ') or null

		# Create markdown property
		memberData.markdown = "[#{memberData.name}](#{memberData.url})"
		memberData.markdown += " <#{memberData.email}>"  if memberData.email

		# Return
		return memberData

	# Get the members
	# return []
	getMembers: (members) ->
		# Log
		@log 'debug', 'Get members'

		# Prepare
		membersComparator = (a,b) ->
			A = a.name.toLowerCase()
			B = b.name.toLowerCase()
			if A is B
				0
			else if A < B
				-1
			else
				1

		# Allow the user to pass in their own members array or object
		if members? is false
			members = @membersMap
		else
			# Remove duplicates from array
			if typeChecker.isArray(members) is true
				exists = {}
				members = members.filter (member) ->
					exists[member.username] ?= 0
					++exists[member.username]
					return exists[member.username] is 1

		# Convert objects to arrays
		if typeChecker.isPlainObject(members) is true
			members = Object.keys(members).map((key) => members[key])

		# Prepare the members that were passed in
		members = members.map(@prepareMemberFinale.bind(@)).sort(membersComparator)

		# Return
		return members

	# Fetch Members From Orgs
	# orgs=["bevry"]
	# next(err)
	# return @
	fetchMembersFromOrgs: (orgs, opts={}, next) ->
		# Prepare
		[opts, next] = extractOptsAndCallback(opts, next)

		# Prepare
		me = @
		result = []
		tasks = TaskGroup.create({concurrency:0}).done (err) ->
			return next(err, [])  if err
			result = me.getMembers(result)
			return next(null, result)

		# Log
		@log 'debug', 'Get members from orgs:', orgs

		# Add the members for each org
		orgs.forEach (org) ->
			tasks.addTask (complete) ->
				me.fetchMembersFromOrg org, (err,members=[]) ->
					return complete(err)  if err
					result.push(members...)
					return complete()

		# Start
		tasks.run()

		# Chain
		@

	# Fetch Members from Organisation
	# org="bevry"
	# next(err)
	# return @
	fetchMembersFromOrg: (org, opts={}, next) ->
		# Prepare
		[opts, next] = extractOptsAndCallback(opts, next)
		opts.profile ?= true

		# Prepare
		me = @
		feedr = @feedr

		# Log
		@log 'debug', 'Get members from org:', org

		# Fetch the org's users
		feedr.readFeed "#{ghapi}/orgs/#{org}/public_members?per_page=100&#{githubAuthQueryString}", Object.assign({parse:'json', opts}), (err,users) ->
			# Check
			return next(err, [])  if err
			return next(null, [])  unless users?.length

			# Prepare
			addedUsers = []

			# Add the tasks for fetching their full data
			tasks = TaskGroup.create({concurrency:0}).done (err) ->
				return next(err, [])  if err
				return next(null, addedUsers)

			# Extract the correct data from the user
			users.forEach (user) ->
				# Prepare
				userData =
					url: user.html_url
					username: user.login
					orgs: {}
					profile: null

				# Add the organisation
				userData.orgs[org] = "https://github.com/#{org}"

				# Add user
				addedUser = me.addMember(userData)
				addedUsers.push(addedUser)  if addedUser

				# Fetch profile if it hasn't been fetched already
				unless addedUser.profile
					tasks.addTask (complete) ->
						feedr.readFeed user.url+"?#{githubAuthQueryString}", Object.assign({parse:'json'}, opts), (err, profile) ->
							# Check
							return complete(err)  if err

							# Apply
							addedUser.email or= profile.email
							addedUser.name or= profile.name
							addedUser.profile = profile

							# Complete
							return complete()

			# Runs tasks
			tasks.run()

		# Chain
		@

# Export
module.exports =
	create: (args...) ->
		return new Getter(args...)
