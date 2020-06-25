/* eslint camelcase:0 */

// Import
import type { StrictUnion } from 'simplytyped'
import fetch from 'cross-fetch'
import Fellow from 'fellow'
import { getHeaders } from 'githubauthreq'
import { env } from 'process'
const { GITHUB_API = 'https://api.github.com' } = env

/** Collection of fellows */
export type Fellows = Set<Fellow>

/** Export the Fellow class we have imported and are using, such that consumers of this package and ensure they are interacting with the same singletons */
export { Fellow }

/** GitHub's response when an error occurs */
interface GitHubError {
	message: string
}

/**
 * GitHub's response to getting a members of an organisation
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

/** Fetch the full profile information for a member */
export async function getMemberProfile(url: string): Promise<GitHubProfile> {
	const resp = await fetch(url, {
		headers: getHeaders(),
	})
	const responseData = (await resp.json()) as GitHubProfileResponse

	// Check
	if (responseData.message) {
		return Promise.reject(new Error(responseData.message))
	}

	// Return
	return responseData as GitHubProfile
}

/** Fetch members from a GitHub organisation */
export async function getMembersFromOrg(org: string): Promise<Fellows> {
	// Fetch
	const url = `${GITHUB_API}/orgs/${org}/public_members?per_page=100`
	const resp = await fetch(url, {
		headers: getHeaders(),
	})
	const responseData = (await resp.json()) as GitHubMembersResponse

	// Check
	if (responseData.message) {
		return Promise.reject(new Error(responseData.message))
	} else if (!Array.isArray(responseData)) {
		return Promise.reject(new Error('response was not an array of members'))
	} else if (responseData.length === 0) {
		return new Set<Fellow>()
	}

	// Process
	return new Set<Fellow>(
		await Promise.all(
			responseData.map(async function (contributor) {
				const profile = await getMemberProfile(contributor.url)
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

/** Fetch members from GitHub organisations with duplicates removed */
export async function getMembersFromOrgs(
	orgs: Array<string>
): Promise<Fellows> {
	return Fellow.flatten(
		await Promise.all(orgs.map((org) => getMembersFromOrg(org)))
	)
}
