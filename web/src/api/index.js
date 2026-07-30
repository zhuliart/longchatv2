/* api 层出口（T6.1）：各模块与契约路由一一对应，页面禁止直连 fetch。 */
export { client, ApiError, setApiHandlers } from './client.js';
export { useResource } from './useResource.js';
export * as authApi from './auth.js';
export * as usersApi from './users.js';
export * as lettersApi from './letters.js';
export * as draftsApi from './drafts.js';
export * as moodsApi from './moods.js';
export * as plazaApi from './plaza.js';
export * as matchesApi from './matches.js';
export * as anonApi from './anon.js';
