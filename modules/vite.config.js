import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import deepMerge from 'udany-toolbox/modules/util/helpers/deepMerge.js';

const defaultOptions = {
	root: './client',
	/** @type {{find: string, replacement: string}[]} **/
	alias: [],

	/** @type {String} **/
	sassAutoImport: null
};

function createViteConfig(options = defaultOptions) {
	options = deepMerge({ ...defaultOptions }, options);

	const sassOptions = {};
	if (options.sassAutoImport) {
		sassOptions.additionalData = `@import '${options.sassAutoImport}';\n`
	}

	return defineConfig({
		root: options.root,
		envDir: '../../env',
		plugins: [
			vue()
		],
		resolve: {
			alias: options.alias
		},
		css: {
			preprocessorOptions: {
				scss: {
					...sassOptions,
					importer: function () { return null; }
				}
			}
		},
		optimizeDeps: {
			exclude: ['udany-toolbox']
		}
	});
}

export default createViteConfig;
