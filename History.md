
1.11.4 / 2016-12-01
==================

  * docs: maxage => maxAge
  * fix: maxage => maxAge (#107)
  * update default cookie maxage in readme (#84)
  * add koa-generic-session-sequelize session store (#103)

1.11.3 / 2016-07-24
==================

  * fix: always refresh session (#95)

1.11.2 / 2016-07-12
==================

  * fix: npm pack should not include test dir (#92)

1.11.1 / 2016-06-23
==================

  * fix: make sure ctx.session exists when cookie.path = '/' (#91)

1.11.0 / 2016-06-20
==================

  * Add support for overriding session save conditions per request (#89)

1.10.2 / 2016-03-23
==================

  * fix: check if session exits

1.10.1 / 2015-12-15
==================

  * feat: ctx.session as a setter/getter

1.10.0 / 2015-11-15
==================

  * feat: support valid/beforeSave hooks

1.9.2 / 2015-08-26
==================

  * fix: support custom cookie options

1.9.1 / 2015-08-23
==================

  * Fix typo of 'available'

1.9.0 / 2015-06-05
==================

  * Added session id storage option to override session id store logic.

1.8.0 / 2015-03-15
==================

  * feat: support reconnectTimeout

1.7.0 / 2015-03-01
==================

  * Add support for regenerating sessions.

1.6.0 / 2015-01-16
==================

  * Merge pull request #39 from rfink/sess_id_optional_check
  * Allow a forced session id that is not available in the cookie

1.5.0 / 2015-01-07
==================

  * Merge pull request #37 from rfink/session_id_context
  * Bind genSid to context, add tests

1.4.0 / 2015-01-06
==================

  * fix(sessionId): ensure session id generate before yield next
  * fix indent

1.3.0 / 2014-11-22
==================

  * support options.errorHanlder, default throw set error

1.2.3 / 2014-11-17
==================

  * Delete session-id cookie if session not loaded.
  * export the session store object

1.2.2 / 2014-09-16
==================

  * use crc instead of buffer-crc32

1.2.1 / 2014-08-11
==================

  * use parseurl get the original url pathname

1.2.0 / 2014-08-09
==================

  * Merge pull request #25 from mekwall/patch-2
  * Added description for allowEmpty option
  * Added option to allow generation of empty session

1.1.3 / 2014-08-05
==================

  * Merge pull request #23 from mekwall/patch-1
  * Fixes MemoryStore not being exported

1.1.2 / 2014-07-07
==================

  * delete cookie.maxAge

1.1.1 / 2014-07-07
==================

  * fix maxage compat

1.1.0 / 2014-07-07
==================

  * seperate ttl and cookie.maxage

1.0.0 / 2014-06-29
==================

  * refactor
  * rename to koa-generic-session

0.4.1 / 2014-06-29
==================

  * warn rename to koa-generic-session

0.4.0 / 2014-06-18
==================

  * use uid-safe to generate default sid
  * maxAge -> maxage, close #18
  * Merge pull request #17 from yoshuawuyts/patch-1
  * Update README.md

0.3.3 / 2014-05-23
==================

  * bump dependencies

0.3.2 / 2014-05-22
==================

  * support options.genSid, fixed #16

0.3.1 / 2014-03-27
==================

  * fix store options bug, fixed #13

0.3.0 / 2014-03-15
==================

  * Merge pull request #11 from dead-horse/issue9-rolling-session
  * fix readme
  * add rolling session options, fixed #9
  * Merge pull request #10 from dead-horse/issue8-refresh
  * fixed #8, only gen cookie and set session when session is really modified

0.2.1 / 2014-03-14
==================

  * fix path error, fix defer session setter

0.2.0 / 2014-03-14
==================

  * Merge pull request #7 from dead-horse/issue6-defer
  * remove coverage
  * update readme
  * fix travis
  * finish defer, fixed #6
  * get session return status
  * add test for defer
  * add defer session

0.1.0 / 2014-02-27
==================

  * fix cookie.expires

0.1.0-beta1 / 2014-02-27
==================

  * update readme
  * seperate Store

0.0.9 / 2014-02-27
==================

  * fix new session setCookie twice

0.0.8 / 2014-02-11
==================

  * Merge pull request #3 from dead-horse/fix-cookie
  * get session error, throw it
  * only set the cookie when sessin was modified
  * Changed position of cookies.set
  * fix test
  * fix typo

0.0.7 / 2014-02-01
==================

  * fix maxage and compat connect type maxAge
  * add autod

0.0.6 / 2014-01-20
==================

  * when store is disconnect, throw 500

0.0.5 / 2013-12-30
==================

  * add middware name session

0.0.4 / 2013-12-29
==================

  * fix package.json

0.0.3 / 2013-12-29
==================

  * update readme
  * add cookie in session

0.0.2 / 2013-12-28
==================

  * Release 0.0.2
  * update readme
  * remove secret
  * use default cookie's signature

0.0.1 / 2013-12-28
==================

  * update test
  * add travis yml
  * update test
  * init session with memory store
  * Initial commit
