/* 
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = UrlMappingProvider;

var url = require('url');

/**
 * Creates new instance of URL mapping provider.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve mappings.
 * @constructor
 */
function UrlMappingProvider($serviceLocator) {
	var self = this;
	this._urlMappers = [];
	$serviceLocator
		.resolveAll('urlMapper')
		.forEach(function (mapper) {
			if (typeof(mapper) !== 'object' ||
				!(mapper.expression instanceof RegExp) ||
				!(mapper.map instanceof Function)) {
				return;
			}
			self._urlMappers.push(mapper);
		});
}

/**
 * Current list of mappers.
 * @type {Array}
 * @private
 */
UrlMappingProvider.prototype._urlMappers = null;

/**
 * Maps specified URL with found mapper if it exists.
 * @param {string} urlText URL to map.
 * @returns {string} Mapped URL.
 */
UrlMappingProvider.prototype.map = function (urlText) {
	if (this._urlMappers.length === 0) {
		return urlText;
	}

	var urlInfo = url.parse(urlText),
		currentPath =
			String(urlInfo.pathname || '') +
			String(urlInfo.search || '') +
			String(urlInfo.hash || ''),
		mapped;
	for (var i = 0; i < this._urlMappers.length; i++) {
		if (!this._urlMappers[i].expression.test(currentPath)) {
			continue;
		}

		mapped = this._urlMappers[i].map(Object.create(urlInfo));
		break;
	}

	if (!mapped) {
		return urlText;
	}

	return url.format(mapped);
};