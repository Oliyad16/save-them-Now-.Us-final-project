"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "better-sqlite3":
/*!*********************************!*\
  !*** external "better-sqlite3" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("better-sqlite3");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=E%3A%5CDownload%5Csavethemnow.Jesus%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=E%3A%5CDownload%5Csavethemnow.Jesus&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=E%3A%5CDownload%5Csavethemnow.Jesus%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=E%3A%5CDownload%5Csavethemnow.Jesus&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var E_Download_savethemnow_Jesus_src_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./src/app/api/auth/[...nextauth]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"E:\\\\Download\\\\savethemnow.Jesus\\\\src\\\\app\\\\api\\\\auth\\\\[...nextauth]\\\\route.ts\",\n    nextConfigOutput,\n    userland: E_Download_savethemnow_Jesus_src_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/[...nextauth]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlLnRzJmFwcERpcj1FJTNBJTVDRG93bmxvYWQlNUNzYXZldGhlbW5vdy5KZXN1cyU1Q3NyYyU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9RSUzQSU1Q0Rvd25sb2FkJTVDc2F2ZXRoZW1ub3cuSmVzdXMmaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQzZCO0FBQzFHO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc2F2ZXRoZW1ub3ctamVzdXMvP2JlY2YiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiRTpcXFxcRG93bmxvYWRcXFxcc2F2ZXRoZW1ub3cuSmVzdXNcXFxcc3JjXFxcXGFwcFxcXFxhcGlcXFxcYXV0aFxcXFxbLi4ubmV4dGF1dGhdXFxcXHJvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hdXRoL1suLi5uZXh0YXV0aF1cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIkU6XFxcXERvd25sb2FkXFxcXHNhdmV0aGVtbm93Lkplc3VzXFxcXHNyY1xcXFxhcHBcXFxcYXBpXFxcXGF1dGhcXFxcWy4uLm5leHRhdXRoXVxcXFxyb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=E%3A%5CDownload%5Csavethemnow.Jesus%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=E%3A%5CDownload%5Csavethemnow.Jesus&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/auth/[...nextauth]/route.ts":
/*!*************************************************!*\
  !*** ./src/app/api/auth/[...nextauth]/route.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _lib_auth_auth_config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth/auth-config */ \"(rsc)/./src/lib/auth/auth-config.ts\");\n\n\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_0___default()(_lib_auth_auth_config__WEBPACK_IMPORTED_MODULE_1__.authConfig);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBZ0M7QUFDbUI7QUFFbkQsTUFBTUUsVUFBVUYsZ0RBQVFBLENBQUNDLDZEQUFVQTtBQUVPIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc2F2ZXRoZW1ub3ctamVzdXMvLi9zcmMvYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHM/MDA5OCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTmV4dEF1dGggZnJvbSAnbmV4dC1hdXRoJ1xuaW1wb3J0IHsgYXV0aENvbmZpZyB9IGZyb20gJ0AvbGliL2F1dGgvYXV0aC1jb25maWcnXG5cbmNvbnN0IGhhbmRsZXIgPSBOZXh0QXV0aChhdXRoQ29uZmlnKVxuXG5leHBvcnQgeyBoYW5kbGVyIGFzIEdFVCwgaGFuZGxlciBhcyBQT1NUIH0iXSwibmFtZXMiOlsiTmV4dEF1dGgiLCJhdXRoQ29uZmlnIiwiaGFuZGxlciIsIkdFVCIsIlBPU1QiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/auth/auth-config.ts":
/*!*************************************!*\
  !*** ./src/lib/auth/auth-config.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authConfig: () => (/* binding */ authConfig)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var next_auth_providers_google__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth/providers/google */ \"(rsc)/./node_modules/next-auth/providers/google.js\");\n/* harmony import */ var _lib_database_connection__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/database/connection */ \"(rsc)/./src/lib/database/connection.ts\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! bcryptjs */ \"(rsc)/./node_modules/bcryptjs/index.js\");\n\n\n\n\nconst authConfig = {\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            id: \"credentials\",\n            name: \"Email and Password\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials?.password) {\n                    return null;\n                }\n                const db = (0,_lib_database_connection__WEBPACK_IMPORTED_MODULE_2__.getDatabase)();\n                const user = db.prepare(\"SELECT id, email, password_hash, name, tier, email_verified FROM users WHERE email = ?\").get(credentials.email);\n                if (!user || !user.password_hash) {\n                    return null;\n                }\n                const isPasswordValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_3__[\"default\"].compare(credentials.password, user.password_hash);\n                if (!isPasswordValid) {\n                    return null;\n                }\n                // Update last login\n                db.prepare(\"UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?\").run(user.id);\n                return {\n                    id: user.id.toString(),\n                    email: user.email,\n                    name: user.name,\n                    tier: user.tier,\n                    emailVerified: user.email_verified\n                };\n            }\n        }),\n        ...process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [\n            (0,next_auth_providers_google__WEBPACK_IMPORTED_MODULE_1__[\"default\"])({\n                clientId: process.env.GOOGLE_CLIENT_ID,\n                clientSecret: process.env.GOOGLE_CLIENT_SECRET\n            })\n        ] : []\n    ],\n    session: {\n        strategy: \"jwt\",\n        maxAge: 30 * 24 * 60 * 60,\n        updateAge: 24 * 60 * 60\n    },\n    callbacks: {\n        async session ({ session, token }) {\n            if (session?.user && token) {\n                session.user.id = token.sub;\n                session.user.tier = token.tier;\n            }\n            return session;\n        },\n        async jwt ({ token, user }) {\n            if (user) {\n                token.id = user.id;\n                token.tier = user.tier;\n            }\n            return token;\n        }\n    },\n    pages: {\n        signIn: \"/auth/signin\",\n        signUp: \"/auth/signup\",\n        error: \"/auth/error\",\n        verifyRequest: \"/auth/verify-request\"\n    },\n    events: {\n        async signIn ({ user }) {\n            const db = (0,_lib_database_connection__WEBPACK_IMPORTED_MODULE_2__.getDatabase)();\n            db.prepare(`\n        INSERT INTO user_activity (user_id, activity_type, activity_data) \n        VALUES (?, 'sign_in', '{}')\n      `).run(user.id);\n        }\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL2F1dGgvYXV0aC1jb25maWcudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFDaUU7QUFDVjtBQUNBO0FBQzFCO0FBRXRCLE1BQU1JLGFBQThCO0lBQ3pDQyxXQUFXO1FBQ1RMLDJFQUFtQkEsQ0FBQztZQUNsQk0sSUFBSTtZQUNKQyxNQUFNO1lBQ05DLGFBQWE7Z0JBQ1hDLE9BQU87b0JBQUVDLE9BQU87b0JBQVNDLE1BQU07Z0JBQVE7Z0JBQ3ZDQyxVQUFVO29CQUFFRixPQUFPO29CQUFZQyxNQUFNO2dCQUFXO1lBQ2xEO1lBQ0EsTUFBTUUsV0FBVUwsV0FBVztnQkFDekIsSUFBSSxDQUFDQSxhQUFhQyxTQUFTLENBQUNELGFBQWFJLFVBQVU7b0JBQ2pELE9BQU87Z0JBQ1Q7Z0JBRUEsTUFBTUUsS0FBS1oscUVBQVdBO2dCQUN0QixNQUFNYSxPQUFPRCxHQUFHRSxPQUFPLENBQ3JCLDBGQUNBQyxHQUFHLENBQUNULFlBQVlDLEtBQUs7Z0JBRXZCLElBQUksQ0FBQ00sUUFBUSxDQUFDQSxLQUFLRyxhQUFhLEVBQUU7b0JBQ2hDLE9BQU87Z0JBQ1Q7Z0JBRUEsTUFBTUMsa0JBQWtCLE1BQU1oQix3REFBYyxDQUFDSyxZQUFZSSxRQUFRLEVBQUVHLEtBQUtHLGFBQWE7Z0JBRXJGLElBQUksQ0FBQ0MsaUJBQWlCO29CQUNwQixPQUFPO2dCQUNUO2dCQUVBLG9CQUFvQjtnQkFDcEJMLEdBQUdFLE9BQU8sQ0FBQyxnRUFDUkssR0FBRyxDQUFDTixLQUFLVCxFQUFFO2dCQUVkLE9BQU87b0JBQ0xBLElBQUlTLEtBQUtULEVBQUUsQ0FBQ2dCLFFBQVE7b0JBQ3BCYixPQUFPTSxLQUFLTixLQUFLO29CQUNqQkYsTUFBTVEsS0FBS1IsSUFBSTtvQkFDZmdCLE1BQU1SLEtBQUtRLElBQUk7b0JBQ2ZDLGVBQWVULEtBQUtVLGNBQWM7Z0JBQ3BDO1lBQ0Y7UUFDRjtXQUVJQyxRQUFRQyxHQUFHLENBQUNDLGdCQUFnQixJQUFJRixRQUFRQyxHQUFHLENBQUNFLG9CQUFvQixHQUFHO1lBQ3JFNUIsc0VBQWNBLENBQUM7Z0JBQ2I2QixVQUFVSixRQUFRQyxHQUFHLENBQUNDLGdCQUFnQjtnQkFDdENHLGNBQWNMLFFBQVFDLEdBQUcsQ0FBQ0Usb0JBQW9CO1lBQ2hEO1NBQ0QsR0FBRyxFQUFFO0tBQ1A7SUFHREcsU0FBUztRQUNQQyxVQUFVO1FBQ1ZDLFFBQVEsS0FBSyxLQUFLLEtBQUs7UUFDdkJDLFdBQVcsS0FBSyxLQUFLO0lBQ3ZCO0lBRUFDLFdBQVc7UUFDVCxNQUFNSixTQUFRLEVBQUVBLE9BQU8sRUFBRUssS0FBSyxFQUFFO1lBQzlCLElBQUlMLFNBQVNqQixRQUFRc0IsT0FBTztnQkFDMUJMLFFBQVFqQixJQUFJLENBQUNULEVBQUUsR0FBRytCLE1BQU1DLEdBQUc7Z0JBQzNCTixRQUFRakIsSUFBSSxDQUFDUSxJQUFJLEdBQUdjLE1BQU1kLElBQUk7WUFDaEM7WUFDQSxPQUFPUztRQUNUO1FBRUEsTUFBTU8sS0FBSSxFQUFFRixLQUFLLEVBQUV0QixJQUFJLEVBQUU7WUFDdkIsSUFBSUEsTUFBTTtnQkFDUnNCLE1BQU0vQixFQUFFLEdBQUdTLEtBQUtULEVBQUU7Z0JBQ2xCK0IsTUFBTWQsSUFBSSxHQUFHLEtBQWNBLElBQUk7WUFDakM7WUFDQSxPQUFPYztRQUNUO0lBQ0Y7SUFFQUcsT0FBTztRQUNMQyxRQUFRO1FBQ1JDLFFBQVE7UUFDUkMsT0FBTztRQUNQQyxlQUFlO0lBQ2pCO0lBRUFDLFFBQVE7UUFDTixNQUFNSixRQUFPLEVBQUUxQixJQUFJLEVBQUU7WUFDbkIsTUFBTUQsS0FBS1oscUVBQVdBO1lBQ3RCWSxHQUFHRSxPQUFPLENBQUMsQ0FBQzs7O01BR1osQ0FBQyxFQUFFSyxHQUFHLENBQUNOLEtBQUtULEVBQUU7UUFDaEI7SUFDRjtBQUNGLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9zYXZldGhlbW5vdy1qZXN1cy8uL3NyYy9saWIvYXV0aC9hdXRoLWNvbmZpZy50cz9kNWRiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRBdXRoT3B0aW9ucyB9IGZyb20gJ25leHQtYXV0aCdcbmltcG9ydCBDcmVkZW50aWFsc1Byb3ZpZGVyIGZyb20gJ25leHQtYXV0aC9wcm92aWRlcnMvY3JlZGVudGlhbHMnXG5pbXBvcnQgR29vZ2xlUHJvdmlkZXIgZnJvbSAnbmV4dC1hdXRoL3Byb3ZpZGVycy9nb29nbGUnXG5pbXBvcnQgeyBnZXREYXRhYmFzZSB9IGZyb20gJ0AvbGliL2RhdGFiYXNlL2Nvbm5lY3Rpb24nXG5pbXBvcnQgYmNyeXB0IGZyb20gJ2JjcnlwdGpzJ1xuXG5leHBvcnQgY29uc3QgYXV0aENvbmZpZzogTmV4dEF1dGhPcHRpb25zID0ge1xuICBwcm92aWRlcnM6IFtcbiAgICBDcmVkZW50aWFsc1Byb3ZpZGVyKHtcbiAgICAgIGlkOiAnY3JlZGVudGlhbHMnLFxuICAgICAgbmFtZTogJ0VtYWlsIGFuZCBQYXNzd29yZCcsXG4gICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICBlbWFpbDogeyBsYWJlbDogJ0VtYWlsJywgdHlwZTogJ2VtYWlsJyB9LFxuICAgICAgICBwYXNzd29yZDogeyBsYWJlbDogJ1Bhc3N3b3JkJywgdHlwZTogJ3Bhc3N3b3JkJyB9XG4gICAgICB9LFxuICAgICAgYXN5bmMgYXV0aG9yaXplKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgIGlmICghY3JlZGVudGlhbHM/LmVtYWlsIHx8ICFjcmVkZW50aWFscz8ucGFzc3dvcmQpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpXG4gICAgICAgIGNvbnN0IHVzZXIgPSBkYi5wcmVwYXJlKFxuICAgICAgICAgICdTRUxFQ1QgaWQsIGVtYWlsLCBwYXNzd29yZF9oYXNoLCBuYW1lLCB0aWVyLCBlbWFpbF92ZXJpZmllZCBGUk9NIHVzZXJzIFdIRVJFIGVtYWlsID0gPydcbiAgICAgICAgKS5nZXQoY3JlZGVudGlhbHMuZW1haWwpIGFzIGFueVxuXG4gICAgICAgIGlmICghdXNlciB8fCAhdXNlci5wYXNzd29yZF9oYXNoKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlzUGFzc3dvcmRWYWxpZCA9IGF3YWl0IGJjcnlwdC5jb21wYXJlKGNyZWRlbnRpYWxzLnBhc3N3b3JkLCB1c2VyLnBhc3N3b3JkX2hhc2gpXG4gICAgICAgIFxuICAgICAgICBpZiAoIWlzUGFzc3dvcmRWYWxpZCkge1xuICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgbGFzdCBsb2dpblxuICAgICAgICBkYi5wcmVwYXJlKCdVUERBVEUgdXNlcnMgU0VUIGxhc3RfbG9naW4gPSBDVVJSRU5UX1RJTUVTVEFNUCBXSEVSRSBpZCA9ID8nKVxuICAgICAgICAgIC5ydW4odXNlci5pZClcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiB1c2VyLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgICAgbmFtZTogdXNlci5uYW1lLFxuICAgICAgICAgIHRpZXI6IHVzZXIudGllcixcbiAgICAgICAgICBlbWFpbFZlcmlmaWVkOiB1c2VyLmVtYWlsX3ZlcmlmaWVkXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSxcbiAgICBcbiAgICAuLi4ocHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9JRCAmJiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX1NFQ1JFVCA/IFtcbiAgICAgIEdvb2dsZVByb3ZpZGVyKHtcbiAgICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfSUQsXG4gICAgICAgIGNsaWVudFNlY3JldDogcHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9TRUNSRVRcbiAgICAgIH0pXG4gICAgXSA6IFtdKVxuICBdLFxuXG5cbiAgc2Vzc2lvbjoge1xuICAgIHN0cmF0ZWd5OiAnand0JyxcbiAgICBtYXhBZ2U6IDMwICogMjQgKiA2MCAqIDYwLCAvLyAzMCBkYXlzXG4gICAgdXBkYXRlQWdlOiAyNCAqIDYwICogNjAsIC8vIDI0IGhvdXJzXG4gIH0sXG5cbiAgY2FsbGJhY2tzOiB7XG4gICAgYXN5bmMgc2Vzc2lvbih7IHNlc3Npb24sIHRva2VuIH0pIHtcbiAgICAgIGlmIChzZXNzaW9uPy51c2VyICYmIHRva2VuKSB7XG4gICAgICAgIHNlc3Npb24udXNlci5pZCA9IHRva2VuLnN1YlxuICAgICAgICBzZXNzaW9uLnVzZXIudGllciA9IHRva2VuLnRpZXJcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZXNzaW9uXG4gICAgfSxcblxuICAgIGFzeW5jIGp3dCh7IHRva2VuLCB1c2VyIH0pIHtcbiAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgIHRva2VuLmlkID0gdXNlci5pZFxuICAgICAgICB0b2tlbi50aWVyID0gKHVzZXIgYXMgYW55KS50aWVyXG4gICAgICB9XG4gICAgICByZXR1cm4gdG9rZW5cbiAgICB9XG4gIH0sXG5cbiAgcGFnZXM6IHtcbiAgICBzaWduSW46ICcvYXV0aC9zaWduaW4nLFxuICAgIHNpZ25VcDogJy9hdXRoL3NpZ251cCcsXG4gICAgZXJyb3I6ICcvYXV0aC9lcnJvcicsXG4gICAgdmVyaWZ5UmVxdWVzdDogJy9hdXRoL3ZlcmlmeS1yZXF1ZXN0JyxcbiAgfSxcblxuICBldmVudHM6IHtcbiAgICBhc3luYyBzaWduSW4oeyB1c2VyIH0pIHtcbiAgICAgIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKVxuICAgICAgZGIucHJlcGFyZShgXG4gICAgICAgIElOU0VSVCBJTlRPIHVzZXJfYWN0aXZpdHkgKHVzZXJfaWQsIGFjdGl2aXR5X3R5cGUsIGFjdGl2aXR5X2RhdGEpIFxuICAgICAgICBWQUxVRVMgKD8sICdzaWduX2luJywgJ3t9JylcbiAgICAgIGApLnJ1bih1c2VyLmlkKVxuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJDcmVkZW50aWFsc1Byb3ZpZGVyIiwiR29vZ2xlUHJvdmlkZXIiLCJnZXREYXRhYmFzZSIsImJjcnlwdCIsImF1dGhDb25maWciLCJwcm92aWRlcnMiLCJpZCIsIm5hbWUiLCJjcmVkZW50aWFscyIsImVtYWlsIiwibGFiZWwiLCJ0eXBlIiwicGFzc3dvcmQiLCJhdXRob3JpemUiLCJkYiIsInVzZXIiLCJwcmVwYXJlIiwiZ2V0IiwicGFzc3dvcmRfaGFzaCIsImlzUGFzc3dvcmRWYWxpZCIsImNvbXBhcmUiLCJydW4iLCJ0b1N0cmluZyIsInRpZXIiLCJlbWFpbFZlcmlmaWVkIiwiZW1haWxfdmVyaWZpZWQiLCJwcm9jZXNzIiwiZW52IiwiR09PR0xFX0NMSUVOVF9JRCIsIkdPT0dMRV9DTElFTlRfU0VDUkVUIiwiY2xpZW50SWQiLCJjbGllbnRTZWNyZXQiLCJzZXNzaW9uIiwic3RyYXRlZ3kiLCJtYXhBZ2UiLCJ1cGRhdGVBZ2UiLCJjYWxsYmFja3MiLCJ0b2tlbiIsInN1YiIsImp3dCIsInBhZ2VzIiwic2lnbkluIiwic2lnblVwIiwiZXJyb3IiLCJ2ZXJpZnlSZXF1ZXN0IiwiZXZlbnRzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/auth/auth-config.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/database/connection.ts":
/*!****************************************!*\
  !*** ./src/lib/database/connection.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   closeDatabase: () => (/* binding */ closeDatabase),\n/* harmony export */   getDatabase: () => (/* binding */ getDatabase)\n/* harmony export */ });\n/* harmony import */ var better_sqlite3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! better-sqlite3 */ \"better-sqlite3\");\n/* harmony import */ var better_sqlite3__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(better_sqlite3__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ \"fs\");\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\nconst dbPath = process.env.DATABASE_PATH || path__WEBPACK_IMPORTED_MODULE_2___default().join(process.cwd(), \"database.sqlite\");\nconst schemaPath = path__WEBPACK_IMPORTED_MODULE_2___default().join(process.cwd(), \"src/lib/database/schema.sql\");\nlet db = null;\nfunction getDatabase() {\n    if (!db) {\n        // Create database file if it doesn't exist\n        const dbDir = path__WEBPACK_IMPORTED_MODULE_2___default().dirname(dbPath);\n        if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(dbDir)) {\n            fs__WEBPACK_IMPORTED_MODULE_1___default().mkdirSync(dbDir, {\n                recursive: true\n            });\n        }\n        // Initialize database connection\n        db = new (better_sqlite3__WEBPACK_IMPORTED_MODULE_0___default())(dbPath);\n        db.pragma(\"journal_mode = WAL\");\n        db.pragma(\"foreign_keys = ON\");\n        // Initialize schema if database is empty\n        initializeSchema();\n    }\n    return db;\n}\nfunction initializeSchema() {\n    if (!db) return;\n    // Check if users table exists\n    const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='users'\").get();\n    if (!tables) {\n        console.log(\"Initializing database schema...\");\n        // Read and execute schema file\n        if (fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(schemaPath)) {\n            const schema = fs__WEBPACK_IMPORTED_MODULE_1___default().readFileSync(schemaPath, \"utf8\");\n            // Split by semicolon and execute each statement\n            const statements = schema.split(\";\").filter((stmt)=>stmt.trim());\n            statements.forEach((statement)=>{\n                try {\n                    db.exec(statement);\n                } catch (error) {\n                    console.error(\"Error executing schema statement:\", error);\n                }\n            });\n            console.log(\"Database schema initialized successfully\");\n        } else {\n            console.error(\"Schema file not found at:\", schemaPath);\n        }\n    }\n}\nfunction closeDatabase() {\n    if (db) {\n        db.close();\n        db = null;\n    }\n}\n// Graceful shutdown\nprocess.on(\"SIGINT\", closeDatabase);\nprocess.on(\"SIGTERM\", closeDatabase);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL2RhdGFiYXNlL2Nvbm5lY3Rpb24udHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBcUM7QUFDbEI7QUFDSTtBQUV2QixNQUFNRyxTQUFTQyxRQUFRQyxHQUFHLENBQUNDLGFBQWEsSUFBSUosZ0RBQVMsQ0FBQ0UsUUFBUUksR0FBRyxJQUFJO0FBQ3JFLE1BQU1DLGFBQWFQLGdEQUFTLENBQUNFLFFBQVFJLEdBQUcsSUFBSTtBQUU1QyxJQUFJRSxLQUErQjtBQUU1QixTQUFTQztJQUNkLElBQUksQ0FBQ0QsSUFBSTtRQUNQLDJDQUEyQztRQUMzQyxNQUFNRSxRQUFRVixtREFBWSxDQUFDQztRQUMzQixJQUFJLENBQUNGLG9EQUFhLENBQUNXLFFBQVE7WUFDekJYLG1EQUFZLENBQUNXLE9BQU87Z0JBQUVJLFdBQVc7WUFBSztRQUN4QztRQUVBLGlDQUFpQztRQUNqQ04sS0FBSyxJQUFJVix1REFBUUEsQ0FBQ0c7UUFDbEJPLEdBQUdPLE1BQU0sQ0FBQztRQUNWUCxHQUFHTyxNQUFNLENBQUM7UUFFVix5Q0FBeUM7UUFDekNDO0lBQ0Y7SUFFQSxPQUFPUjtBQUNUO0FBRUEsU0FBU1E7SUFDUCxJQUFJLENBQUNSLElBQUk7SUFFVCw4QkFBOEI7SUFDOUIsTUFBTVMsU0FBU1QsR0FBR1UsT0FBTyxDQUN2QixzRUFDQUMsR0FBRztJQUVMLElBQUksQ0FBQ0YsUUFBUTtRQUNYRyxRQUFRQyxHQUFHLENBQUM7UUFFWiwrQkFBK0I7UUFDL0IsSUFBSXRCLG9EQUFhLENBQUNRLGFBQWE7WUFDN0IsTUFBTWUsU0FBU3ZCLHNEQUFlLENBQUNRLFlBQVk7WUFFM0MsZ0RBQWdEO1lBQ2hELE1BQU1pQixhQUFhRixPQUFPRyxLQUFLLENBQUMsS0FBS0MsTUFBTSxDQUFDQyxDQUFBQSxPQUFRQSxLQUFLQyxJQUFJO1lBRTdESixXQUFXSyxPQUFPLENBQUMsQ0FBQ0M7Z0JBQ2xCLElBQUk7b0JBQ0Z0QixHQUFJdUIsSUFBSSxDQUFDRDtnQkFDWCxFQUFFLE9BQU9FLE9BQU87b0JBQ2RaLFFBQVFZLEtBQUssQ0FBQyxxQ0FBcUNBO2dCQUNyRDtZQUNGO1lBRUFaLFFBQVFDLEdBQUcsQ0FBQztRQUNkLE9BQU87WUFDTEQsUUFBUVksS0FBSyxDQUFDLDZCQUE2QnpCO1FBQzdDO0lBQ0Y7QUFDRjtBQUVPLFNBQVMwQjtJQUNkLElBQUl6QixJQUFJO1FBQ05BLEdBQUcwQixLQUFLO1FBQ1IxQixLQUFLO0lBQ1A7QUFDRjtBQUVBLG9CQUFvQjtBQUNwQk4sUUFBUWlDLEVBQUUsQ0FBQyxVQUFVRjtBQUNyQi9CLFFBQVFpQyxFQUFFLENBQUMsV0FBV0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9zYXZldGhlbW5vdy1qZXN1cy8uL3NyYy9saWIvZGF0YWJhc2UvY29ubmVjdGlvbi50cz8wZDhhIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEYXRhYmFzZSBmcm9tICdiZXR0ZXItc3FsaXRlMydcbmltcG9ydCBmcyBmcm9tICdmcydcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbmNvbnN0IGRiUGF0aCA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1BBVEggfHwgcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkYXRhYmFzZS5zcWxpdGUnKVxuY29uc3Qgc2NoZW1hUGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnc3JjL2xpYi9kYXRhYmFzZS9zY2hlbWEuc3FsJylcblxubGV0IGRiOiBEYXRhYmFzZS5EYXRhYmFzZSB8IG51bGwgPSBudWxsXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRhYmFzZSgpIHtcbiAgaWYgKCFkYikge1xuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBmaWxlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBjb25zdCBkYkRpciA9IHBhdGguZGlybmFtZShkYlBhdGgpXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGRiRGlyKSkge1xuICAgICAgZnMubWtkaXJTeW5jKGRiRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgZGF0YWJhc2UgY29ubmVjdGlvblxuICAgIGRiID0gbmV3IERhdGFiYXNlKGRiUGF0aClcbiAgICBkYi5wcmFnbWEoJ2pvdXJuYWxfbW9kZSA9IFdBTCcpXG4gICAgZGIucHJhZ21hKCdmb3JlaWduX2tleXMgPSBPTicpXG5cbiAgICAvLyBJbml0aWFsaXplIHNjaGVtYSBpZiBkYXRhYmFzZSBpcyBlbXB0eVxuICAgIGluaXRpYWxpemVTY2hlbWEoKVxuICB9XG4gIFxuICByZXR1cm4gZGJcbn1cblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNjaGVtYSgpIHtcbiAgaWYgKCFkYikgcmV0dXJuXG5cbiAgLy8gQ2hlY2sgaWYgdXNlcnMgdGFibGUgZXhpc3RzXG4gIGNvbnN0IHRhYmxlcyA9IGRiLnByZXBhcmUoXG4gICAgXCJTRUxFQ1QgbmFtZSBGUk9NIHNxbGl0ZV9tYXN0ZXIgV0hFUkUgdHlwZT0ndGFibGUnIEFORCBuYW1lPSd1c2VycydcIlxuICApLmdldCgpXG5cbiAgaWYgKCF0YWJsZXMpIHtcbiAgICBjb25zb2xlLmxvZygnSW5pdGlhbGl6aW5nIGRhdGFiYXNlIHNjaGVtYS4uLicpXG4gICAgXG4gICAgLy8gUmVhZCBhbmQgZXhlY3V0ZSBzY2hlbWEgZmlsZVxuICAgIGlmIChmcy5leGlzdHNTeW5jKHNjaGVtYVBhdGgpKSB7XG4gICAgICBjb25zdCBzY2hlbWEgPSBmcy5yZWFkRmlsZVN5bmMoc2NoZW1hUGF0aCwgJ3V0ZjgnKVxuICAgICAgXG4gICAgICAvLyBTcGxpdCBieSBzZW1pY29sb24gYW5kIGV4ZWN1dGUgZWFjaCBzdGF0ZW1lbnRcbiAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBzY2hlbWEuc3BsaXQoJzsnKS5maWx0ZXIoc3RtdCA9PiBzdG10LnRyaW0oKSlcbiAgICAgIFxuICAgICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkYiEuZXhlYyhzdGF0ZW1lbnQpXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZXhlY3V0aW5nIHNjaGVtYSBzdGF0ZW1lbnQ6JywgZXJyb3IpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdEYXRhYmFzZSBzY2hlbWEgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5JylcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignU2NoZW1hIGZpbGUgbm90IGZvdW5kIGF0OicsIHNjaGVtYVBhdGgpXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZURhdGFiYXNlKCkge1xuICBpZiAoZGIpIHtcbiAgICBkYi5jbG9zZSgpXG4gICAgZGIgPSBudWxsXG4gIH1cbn1cblxuLy8gR3JhY2VmdWwgc2h1dGRvd25cbnByb2Nlc3Mub24oJ1NJR0lOVCcsIGNsb3NlRGF0YWJhc2UpXG5wcm9jZXNzLm9uKCdTSUdURVJNJywgY2xvc2VEYXRhYmFzZSkiXSwibmFtZXMiOlsiRGF0YWJhc2UiLCJmcyIsInBhdGgiLCJkYlBhdGgiLCJwcm9jZXNzIiwiZW52IiwiREFUQUJBU0VfUEFUSCIsImpvaW4iLCJjd2QiLCJzY2hlbWFQYXRoIiwiZGIiLCJnZXREYXRhYmFzZSIsImRiRGlyIiwiZGlybmFtZSIsImV4aXN0c1N5bmMiLCJta2RpclN5bmMiLCJyZWN1cnNpdmUiLCJwcmFnbWEiLCJpbml0aWFsaXplU2NoZW1hIiwidGFibGVzIiwicHJlcGFyZSIsImdldCIsImNvbnNvbGUiLCJsb2ciLCJzY2hlbWEiLCJyZWFkRmlsZVN5bmMiLCJzdGF0ZW1lbnRzIiwic3BsaXQiLCJmaWx0ZXIiLCJzdG10IiwidHJpbSIsImZvckVhY2giLCJzdGF0ZW1lbnQiLCJleGVjIiwiZXJyb3IiLCJjbG9zZURhdGFiYXNlIiwiY2xvc2UiLCJvbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/database/connection.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/openid-client","vendor-chunks/uuid","vendor-chunks/oauth","vendor-chunks/@panva","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/bcryptjs","vendor-chunks/preact","vendor-chunks/oidc-token-hash","vendor-chunks/cookie"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=E%3A%5CDownload%5Csavethemnow.Jesus%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=E%3A%5CDownload%5Csavethemnow.Jesus&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();