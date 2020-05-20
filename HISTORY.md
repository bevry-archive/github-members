# History

## v4.0.0 2020 May 21

-   Breaking Change: API has been rewritten to take advantage of many ecosystem improvements
-   Converted from CoffeeScript to TypeScript
-   Now uses the [`fellow` package](https://github.com/bevry/fellow) instead of doing that magic ourself
-   Now updated for the [`githubauthreq` package](https://github.com/bevry/githubauthreq) to ensure github requests are authenticated
-   Adds support for the `GITHUB_API` env variable, in case you wish to use a proxy for pagination and rate limiting improvements
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v3.0.0 2020 May 6

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Minimum required node version changed from `node: >=8` to `node: >=10` to keep up with mandatory ecosystem changes

## v2.1.0 2019 December 9

-   Implemented support for `GITHUB_API` environment variable to access the GitHub API via a proxy
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v2.0.0 2019 September 10

-   Now uses [githubauthquerystring](https://github.com/bevry/githubauthquerystring) for github auth query string, instead of the configuration object
-   Updated [base files](https://github.com/bevry/base) and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Updated dependencies

## v1.0.0 2014 May 3

-   Initial working version
