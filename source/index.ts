/* eslint camelcase:0 */

// external
import type { StrictUnion } from 'simplytyped'
import Fellow from 'fellow'
import Pool from 'native-promise-pool'
import { query, GitHubCredentials } from '@bevry/github-api'
import { append } from '@bevry/list'

/** Options for queries that return multiple results. */
export interface MultiOptions {
	/** If you wish to skip the first page, then set this param, defaults to 1 */
	page?: number

	/** If you wish to change the amount of items returned per page, then set this param */
	size?: number

	/** If you wish to fetch unlimited pages, set this to zero, if you wish to fetch a specific amount of pages, then set this accordingly, defaults to `10` */
	pages?: number

	/** How many requests to make at once, defaults to `0` which is unlimited. */
	concurrency?: number
}

/** Collection of fellows */
export type Fellows = Set<Fellow>

/** Export the Fellow class we have imported and are using, such that consumers of this package and ensure they are interacting with the same singletons */
export { Fellow }

/** GitHub's response when an error occurs */
interface GitHubError {
	message: string
}

/**
 * GitHub's response to getting a members of an organization
 * https://developer.github.com/v3/orgs/members/#members-list
 */
export interface GitHubMember {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	site_admin: boolean
}
export type GitHubMembersResponse = StrictUnion<
	GitHubError | Array<GitHubMember>
>

/**
 * GitHub's response to getting a user
 * https://developer.github.com/v3/users/#get-a-single-user
 */
export interface GitHubProfile {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	site_admin: boolean
	name: string
	company: string
	blog: string
	location: string
	email: string
	hireable: boolean
	bio: string
	public_repos: number
	public_gists: number
	followers: number
	following: number
	created_at: string
	updated_at: string
}
export type GitHubProfileResponse = StrictUnion<GitHubError | GitHubProfile>

/**
 * Fetch the full profile information for a member.
 * @param url the complete API url to fetch the details for the member
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMemberProfile(
	url: string,
	credentials?: GitHubCredentials,
): Promise<GitHubProfile> {
	const resp = await query({
		url,
		userAgent: '@bevry/github-members',
		credentials,
	})
	const data = (await resp.json()) as GitHubProfileResponse

	// Check
	if (data.message) {
		return Promise.reject(new Error(data.message))
	}

	// Return
	return data as GitHubProfile
}

/**
 * Fetch the parsed information for a member.
 * @param url the complete API url to fetch the details for the member
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMember(
	url: string,
	credentials?: GitHubCredentials,
): Promise<Fellow> {
	const profile = await getMemberProfile(url, credentials)
	const fellow = Fellow.ensure({
		githubProfile: profile,
		name: profile.name,
		email: profile.email,
		description: profile.bio,
		company: profile.company,
		location: profile.location,
		homepage: profile.blog,
		hireable: profile.hireable,
		githubUsername: profile.login,
		githubUrl: profile.html_url,
	})
	// @todo fellow.organizations.add(slug);
	return fellow
}

/**
 * Fetch members from a GitHub organization.
 * @param org the org to fetch the members for, e.g. `"bevry"`
 * @param opts custom search options
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMembersFromOrg(
	org: string,
	opts: MultiOptions = {},
	credentials?: GitHubCredentials,
): Promise<Fellows> {
	// defaults
	if (opts.page == null) opts.page = 1
	if (opts.pages == null) opts.pages = 10
	if (opts.size == null) opts.size = 100

	// fetch
	// https://docs.github.com/en/rest/reference/orgs#list-public-organization-members
	const resp = await query({
		pathname: `orgs/${org}/public_members`,
		searchParams: {
			page: String(opts.page),
			per_page: String(opts.size),
		},
		userAgent: '@bevry/github-members',
		credentials,
	})
	const data = (await resp.json()) as GitHubMembersResponse

	// prepare
	const results: Fellows = new Set<Fellow>()

	// check
	if (data.message) throw new Error(data.message)
	if (!Array.isArray(data))
		throw new Error('response was not an array of members')
	if (data.length === 0) return results

	// add these items
	const pool = new Pool(opts.concurrency)
	append(
		results,
		await Promise.all(
			data.map((contributor) =>
				pool.open(() => getMember(contributor.url, credentials)),
			),
		),
	)

	// add next items
	const within = opts.pages === 0 || opts.page < opts.pages
	const anotherPage = data.length === opts.size && within
	if (anotherPage)
		append(
			results,
			await getMembersFromOrg(
				org,
				{
					...opts,
					page: opts.page + 1,
				},
				credentials,
			),
		)

	// return it all
	return results
}

/**
 * Fetch members from GitHub organizations with duplicates removed
 * @param org the orgs to fetch the members for, e.g. `["bevry", "browserstate"]`
 * @param opts custom search options
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMembersFromOrgs(
	orgs: Array<string>,
	opts: MultiOptions = {},
	credentials?: GitHubCredentials,
): Promise<Fellows> {
	const pool = new Pool(opts.concurrency)
	return Fellow.flatten(
		await Promise.all(
			orgs.map((org) =>
				pool.open(() => getMembersFromOrg(org, opts, credentials)),
			),
		),
	)
}
