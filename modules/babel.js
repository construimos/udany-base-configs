const babelRegister = require('@babel/register');
const deepMerge = require('udany-toolbox/helpers/deepMerge.js');

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
