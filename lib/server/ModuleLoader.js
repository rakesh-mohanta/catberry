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

module.exports = ModuleLoader;

var fs = require('fs'),
	util = require('util'),
	path = require('path'),
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	ModuleLoaderBase = require('../ModuleLoaderBase'),
	DummyModule = require('../DummyModule');

var WARN_MODULE_INDEX_NOT_FOUND =
		'Module "%s" does not have "index.js", using empty module instead',
	INFO_WATCHING_FILES = 'Watching files for changes ' +
		'to reload placeholders and modules',
	INFO_FILES_CHANGED = 'Files were changed, ' +
		'reloading placeholders and modules';

util.inherits(ModuleLoader, ModuleLoaderBase);

/**
 * Creates new instance of module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve modules.
 * @param {Logger} $logger Logger to log warn and info messages.
 * @extends ModuleLoaderBase
 * @constructor
 */
function ModuleLoader($serviceLocator, $logger) {
	ModuleLoaderBase.call(this, $serviceLocator);
	this._moduleFinder = $serviceLocator.resolve('moduleFinder');
	this._logger = $logger;
	var self = this;
	if (!this._config.isRelease) {
		this._logger.info(INFO_WATCHING_FILES);
		this._moduleFinder.watch(function () {
			self._logger.info(INFO_FILES_CHANGED);
			// clear require cache to load modules again
			Object.keys(require.cache)
				.forEach(function (key) {
					delete require.cache[key];
				});
			self.loadModules();
		});
	}
}

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ModuleLoader.prototype._logger = null;

/**
 * Current module finder.
 * @type {string}
 * @private
 */
ModuleLoader.prototype._moduleFinder = '';

/**
 * Loads and initializes all modules.
 * @param {Function?} callback Callback on finish.
 */
ModuleLoader.prototype.loadModules = function (callback) {
	callback = callback || dummy;
	var self = this,
		modules = {};
	this._moduleFinder.find(function (found) {
		Object.keys(found)
			.forEach(function (moduleName) {
				var moduleConstructor, moduleImplementation;
				if (typeof(found[moduleName].indexPath) === 'string') {
					try {
						moduleConstructor = require(
							found[moduleName].indexPath);
						if (!(moduleConstructor instanceof Function)) {
							moduleConstructor = DummyModule;
						}
						moduleContextHelper
							.normalizeModuleInterface(moduleConstructor);
					} catch (e) {
						moduleConstructor = DummyModule;
						self._eventBus.emit('error', e);
					}

					var context = Object.create(self._serviceLocator
						.resolve('moduleApiProvider'));
					context.name = moduleName;
					context.state = {};
					context.renderedData = {};
					context.cookies = self._serviceLocator
						.resolve('cookiesWrapper');

					moduleConstructor.prototype.$context = context;
					moduleImplementation = self._serviceLocator
						.resolveInstance(moduleConstructor, self._config);
					if (!moduleImplementation.$context) {
						moduleImplementation.$context = context;
					}
				} else {
					self._logger.warn(util.format(
						WARN_MODULE_INDEX_NOT_FOUND, moduleName));
				}

				var module = {
					name: moduleName,
					implementation: moduleImplementation || new DummyModule(),
					placeholders: {}
				};

				modules[moduleName] = module;
				self._eventBus.emit('moduleLoaded', moduleName);

				self._loadPlaceholders(module, found[moduleName].placeholders);
			});

		self._loadedModules = modules;
		self._placeholdersByIds = null;
		self._eventBus.emit('allModulesLoaded');

		callback(modules);
	});
};

/**
 * Gets all modules in current modules folder.
 * @returns {Object} Set of loaded modules.
 */
ModuleLoader.prototype.getModulesByNames = function () {
	return this._loadedModules;
};

/**
 * Loads placeholders from found paths.
 * @param {Object} module Loaded module Object.
 * @param {Object} placeholders Found placeholders paths.
 * @private
 */
ModuleLoader.prototype._loadPlaceholders = function (module, placeholders) {
	var self = this;
	Object.keys(placeholders)
		.forEach(function (placeholderName) {
			var fullName = moduleContextHelper
				.joinModuleNameAndContext(module.name,
				placeholderName);

			var source = fs.readFileSync(
				placeholders[placeholderName],
				{encoding: 'utf8'});
			self._templateProvider.registerSource(fullName, source);

			self._eventBus.emit('placeholderLoaded', {
				name: placeholderName,
				moduleName: module.name
			});

			var placeholder = {
				moduleName: module.name,
				name: placeholderName,
				getTemplateStream: function (data) {
					return self._templateProvider.getStream(
						fullName, data);
				}
			};
			if (moduleContextHelper.isRootPlaceholder(placeholderName)) {
				module.rootPlaceholder = placeholder;
				module.rootPlaceholder.name = placeholderName;
				return;
			}

			if (moduleContextHelper.isErrorPlaceholder(placeholderName)) {
				module.errorPlaceholder = placeholder;
				module.errorPlaceholder.name = placeholderName;
				return;
			}

			module.placeholders[placeholderName] = placeholder;
		});
};

/**
 * Does nothing as default callback.
 */
function dummy() {}