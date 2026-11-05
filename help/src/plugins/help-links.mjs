// Giữ nguyên cách viết link của bài (kiểu VitePress) mà vẫn đúng đường dẫn khi build bằng Astro:
//   ./ten-bai, ../nhom/ten-bai  -> /help/<nhom>/ten-bai.html   (tính theo vị trí file .md)
//   ./index (trong thiet-ke/)   -> /help/thiet-ke.html
//   /nhom/ten-bai, /images/x.png -> /help/nhom/ten-bai.html, /help/images/x.png
// Áp dụng cho link/ảnh Markdown và thuộc tính href/src trong HTML viết tay.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP = /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i; // http:, mailto:, #anchor, //host

export function makeResolver(base, docsDir) {
	const b = '/' + base.replace(/^\/+|\/+$/g, '');
	return (url, filePath) => {
		if (!url || SKIP.test(url) || url === b || url.startsWith(b + '/')) return url;
		const m = url.match(/^([^?#]*)(.*)$/);
		let p = m[1];
		const tail = m[2];
		if (!p) return url;
		if (!p.startsWith('/')) {
			// đường dẫn tương đối: tính từ thư mục của file trong src/content/docs
			const rel = path.relative(docsDir, path.dirname(filePath)).split(path.sep).join('/');
			p = path.posix.normalize('/' + (rel ? rel + '/' : '') + p);
		}
		const isAsset = /\.[a-z0-9]+$/i.test(p) && !/\.(md|mdx|html)$/i.test(p);
		if (!isAsset) {
			p = p.replace(/\.(md|mdx|html)$/i, '').replace(/(^|\/)index$/, '$1').replace(/\/+$/, '');
		}
		if (!isAsset) p = (p === '' || p === '/' ? '/index' : p) + '.html'; // khớp kiểu link Starlight tạo (build.format: 'file')
		return b + p + tail;
	};
}

const ATTR = /\b(href|src)=(["'])([^"']*)\2/g;

/** Plugin Sätteri (bộ xử lý Markdown mặc định của Astro 7): viết lại link/ảnh theo vị trí file. */
export function helpLinks({ base, docsDir }) {
	const resolve = makeResolver(base, docsDir);
	return ({ fileURL }) => {
		if (!fileURL) return null;
		const fp = fileURLToPath(fileURL);
		if (!fp.startsWith(docsDir)) return null;
		const fix = (node, ctx) => {
			const next = resolve(node.url, fp);
			if (next !== node.url) ctx.setProperty(node, 'url', next);
		};
		return {
			name: 'vpha-help-links',
			link: fix,
			image: fix,
			definition: fix,
			html(node, ctx) {
				const next = node.value.replace(ATTR, (_, a, q, u) => `${a}=${q}${resolve(u, fp)}${q}`);
				if (next !== node.value) ctx.setProperty(node, 'value', next);
			},
		};
	};
}
