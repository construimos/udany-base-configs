import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import { renderToString } from 'vue/server-renderer'

import api from './api.js';
import deepMerge from 'udany-toolbox/modules/util/helpers/deepMerge.js';

import { UserConfigExport } from 'vite';
import { renderPreloadLinks } from './helpers/ssr.js';

const defaultOptions = {
	port: process.env.PORT ? parseInt(process.env.PORT) : 9420,
	hmrPort: false,
	isProd: process.env.NODE_ENV === 'production',

	basePath: __dirname,

	client: {
		path: 'client'
	},

	api: {
		enabled: true,
		prefix: '/api'
	},

	ssr: {
		enabled: false,
		entry: './src/client/entry-server.js',
		distEntry: '',
		outlets: {
			html: '<!--ssr-outlet-->',
			preload: '<!--preload-links-->',
		}
	},

	/** @type {UserConfigExport} **/
	viteConfig: {},

	https: {
		enabled: process.env.HTTPS ? process.env.HTTPS !== 'false' : true,
		data: {
			key: '',
			cert: ''
		}
	},

	onServerInitialized: (app) => {}
};

export default async function createServer(options = defaultOptions) {
	options = deepMerge({ ...defaultOptions }, options);

	const resolve = (...p) => path.resolve(options.basePath, ...p);

	const indexProd = options.isProd ?
		fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
		: '';

	const manifest = options.isProd ?
		require(resolve('dist/client/ssr-manifest.json'))
	 	: {};

	const app = express();

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: false}));
	if (options.onServerInitialized) options.onServerInitialized(app);

	/** @type {import('vite').ViteDevServer} */
	let vite;

	if (!options.isProd) {
		vite = await require('vite').createServer({
			...options.viteConfig,
			logLevel: 'info',
			server: {
				middlewareMode: true,
				watch: {
					// During tests we edit the files too fast and sometimes chokidar
					// misses change events, so enforce polling for consistency
					usePolling: true,
					interval: 100
				},
				https: options.https.enabled ? options.https.data : null,
				hmr: {
					port: options.hmrPort ? options.hmrPort : options.port + 2000
				}
			},
			appType: 'custom'
		});

		// use vite's connect instance as middleware
		app.use(vite.middlewares);
	} else {
		app.use(require('compression')())
		app.use(
			require('serve-static')(resolve('dist/client'), {
				index: false
			})
		)
	}

	if (options.api.enabled) app.use(options.api.prefix, api);

	app.use('*', async (req, res) => {
		try {
			const url = req.originalUrl

			let template, render;

			if (!options.isProd) {
				template = fs.readFileSync(resolve(options.client.path, 'index.html'), 'utf-8');
				template = await vite.transformIndexHtml(url, template);
			} else {
				template = indexProd;
			}

			let [appHtml, preloadLinks] = ['', ''];

			// SSR
			if (options.ssr.enabled) {
				if (!options.isProd) {
					if (options.ssr.enabled) {
						render = (await vite.ssrLoadModule(options.ssr.entry)).render;
					}
				} else {
					render = require(resolve(options.ssr.distEntry)).render;
				}

				const { app: vueApp } = await render(url, manifest);

				const ctx = {};
				appHtml = await renderToString(vueApp, ctx);

				preloadLinks = renderPreloadLinks(ctx.modules, manifest)
			}

			const html = template
			.replace(options.ssr.outlets.preload, preloadLinks)
			.replace(options.ssr.outlets.html, appHtml);

			res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
		} catch (e) {
			vite && vite.ssrFixStacktrace(e)
			console.log(e.stack)
			res.status(500).end(e.stack)
		}
	});

	const serverProtocol = options.https.enabled ? https : http;

	const server = serverProtocol.createServer({
		...options.https.data
	}, app);

	server.listen(options.port, () => {
		console.log(`http${options.https.enabled ? 's' : ''}://localhost:${options.port}`);
	});

	app.__server = server;

	return {
		server,
		app,
		api,
	};
}
