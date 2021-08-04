/* eslint camelcase:0 */

// external
import type { StrictUnion } from 'simplytyped'
import Fellow from 'fellow'
import Pool from 'native-promise-pool'
import { query, GitHubCredentials } from '@bevry/github-api'

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
 * Fetch the full profile information for a member
 * @param url the complete API url to fetch the details for the member
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMemberProfile(
	url: string,
	credentials?: GitHubCredentials
): Promise<GitHubProfile> {
	const resp = await query({
		url,
		userAgent: '@bevry/github-members',
		credentials,
	})
	const data: GitHubProfileResponse = await resp.json()

	// Check
	if (data.message) {
		return Promise.reject(new Error(data.message))
	}

	// Return
	return data as GitHubProfile
}

/**
 * Fetch members from a GitHub organization
 * @param org the org to fetch the members for, e.g. `"bevry"`
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMembersFromOrg(
	org: string,
	credentials?: GitHubCredentials
): Promise<Fellows> {
	// Fetch
	const resp = await query({
		pathname: `orgs/${org}/public_members`,
		searchParams: {
			per_page: '100',
		},
		userAgent: '@bevry/github-members',
		credentials,
	})
	const data: GitHubMembersResponse = await resp.json()

	// Check
	if (data.message) {
		return Promise.reject(new Error(data.message))
	} else if (!Array.isArray(data)) {
		return Promise.reject(new Error('response was not an array of members'))
	} else if (data.length === 0) {
		return new Set<Fellow>()
	}

	// Process
	return new Set<Fellow>(
		await Promise.all(
			data.map(async function (contributor) {
				const profile = await getMemberProfile(contributor.url, credentials)
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
			})
		)
	)
}

/**
 * Fetch members from GitHub organizations with duplicates removed
 * @param org the orgs to fetch the members for, e.g. `["bevry", "browserstate"]`
 * @param concurrency custom concurrency to use, defaults to `0` which is infinite
 * @param credentials custom github credentials, omit to use the environment variables
 */
export async function getMembersFromOrgs(
	orgs: Array<string>,
	concurrency: number = 0,
	credentials?: GitHubCredentials
): Promise<Fellows> {
	const pool = new Pool(concurrency)
	return Fellow.flatten(
		await Promise.all(
			orgs.map((org) => pool.open(() => getMembersFromOrg(org, credentials)))
		)
	)
}
