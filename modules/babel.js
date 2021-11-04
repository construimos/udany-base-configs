const babelRegister = require('@babel/register');

function deepMerge (target, source) {
	for (const key of Object.keys(source)) {
		if (source[key] instanceof Object){
			if (!target[key]) {
				if (source[key] instanceof Array) {
					target[key] = [];
				} else {
					target[key] = {};
				}
			}

			Object.assign(source[key], deepMerge(target[key], source[key]));
		}
	}

	Object.assign(target || {}, source);

	return target;
}

/**
 * Utility wrapper over @babel/register
 * Must be called before any attempts to use modern syntax within node
 * @param babelOptions
 */
function startBabelRegister(babelOptions) {
	babelRegister(deepMerge(
		{ extensions: ['.js', '.ts'] },
		getBabelOptions(babelOptions)
	));
}

function getBabelOptions(babelOptions) {
	return deepMerge({
		presets: [
			['@babel/preset-env', {
				targets: {
					node: 'current'
				}
			}],

			['@babel/preset-typescript', {
				allowDeclareFields: true,
				onlyRemoveTypeImports: true,
			}]
		],
		plugins: [
			['@babel/plugin-proposal-decorators', {
				legacy: true
			}]
		],

	}, babelOptions);
}

module.exports = {
	getBabelOptions,
	startBabelRegister
}
