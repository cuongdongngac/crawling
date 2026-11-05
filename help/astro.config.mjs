// @ts-check
// Trang trợ giúp VPHA (Astro Starlight) — build ra trang tĩnh, Next.js phục vụ tại /help (cùng repo, cùng lần deploy).
//   npm run help:dev    -> xem thử khi viết bài (http://localhost:4321/help/)
//   npm run help:build  -> xuất ra public/help (tự chạy trong `npm run build`)
// Thêm bài: tạo file .md trong src/content/docs/<nhóm>/ rồi thêm một dòng vào `sidebar` bên dưới.
// Bản tiếng Anh: đặt file cùng tên trong src/content/docs/en/<nhóm>/ (chưa dịch thì tự hiện bản tiếng Việt).
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { fileURLToPath } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import { helpLinks } from './src/plugins/help-links.mjs';

const BASE = '/help';
const docsDir = fileURLToPath(new URL('./src/content/docs', import.meta.url));

/** Một mục sidebar: nhãn tiếng Việt + tiếng Anh */
const item = (/** @type {string} */ slug, /** @type {string} */ vi, /** @type {string} */ en) => ({
	label: vi,
	translations: { en },
	slug,
});

export default defineConfig({
	base: BASE,
	outDir: '../public/help',
	// Xuất mỗi bài thành file .html (quet-thu.html) và link không có dấu "/" cuối:
	// giữ nguyên đường dẫn cũ /help/<nhóm>/<bài>.html mà ứng dụng (HelpLink) đang dùng.
	build: { format: 'file' },
	trailingSlash: 'never',
	// Ứng dụng Next.js ở thư mục gốc đã dùng `cookie` bản 1.x (qua @supabase/ssr); Astro cần bản 2.x
	// (nằm ở node_modules/astro/node_modules). Gói sẵn vào bản build để không lấy nhầm bản ở gốc.
	vite: {
		environments: { prerender: { resolve: { noExternal: ['cookie'] } } },
	},
	markdown: {
		// smartPunctuation: false — giữ nguyên dấu nháy thẳng, "--", "..." như bản VitePress.
		processor: satteri({
			features: { smartPunctuation: false },
			mdastPlugins: [helpLinks({ base: BASE, docsDir })],
		}),
	},
	integrations: [
		starlight({
			title: { vi: 'Trợ giúp VPHA M&E', en: 'VPHA M&E Help' },
			description: 'Hướng dẫn sử dụng hệ thống giám sát hashtag – VPHA',
			logo: { src: './src/assets/icon-192.png', alt: 'VPHA' },
			favicon: '/icons/icon-192.png',
			head: [{ tag: 'meta', attrs: { name: 'theme-color', content: '#1c1917' } }],
			defaultLocale: 'root',
			locales: {
				root: { label: 'Tiếng Việt', lang: 'vi' },
				en: { label: 'English', lang: 'en' },
			},
			lastUpdated: true,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			customCss: ['./src/styles/custom.css'],
			components: {
				SocialIcons: './src/components/SocialIcons.astro',
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{
					label: '1. Bắt đầu',
					translations: { en: '1. Getting started' },
					items: [
						item('bat-dau/gioi-thieu', 'Hệ thống làm gì, không làm gì', 'What the system does and does not do'),
						item('bat-dau/he-thong-cung-cap-gi', 'Hệ thống cung cấp gì — việc gì làm ngoài hệ thống', 'What the system provides — what happens outside it'),
						item('bat-dau/cai-ung-dung', 'Cài ứng dụng lên điện thoại', 'Install the app on your phone'),
						item('bat-dau/nguyen-tac-an-toan', 'Nguyên tắc an toàn khi quan sát', 'Safety rules when observing'),
						item('bat-dau/vai-tro', 'Vai trò và quyền', 'Roles and permissions'),
					],
				},
				{
					label: '2. Cộng tác viên',
					translations: { en: '2. Contributors' },
					items: [
						item('cong-tac-vien/api-key-apify', 'Lấy API key Apify cá nhân', 'Get your personal Apify API key'),
						item('cong-tac-vien/quet-thu', 'Quét thử từ khóa', 'Trial keyword scan'),
						item('cong-tac-vien/ba-tieu-chi', 'Quy tắc ba tiêu chí', 'The three-criteria rule'),
						item('cong-tac-vien/de-xuat-hashtag', 'Gửi phiếu đề xuất hashtag', 'Submit a hashtag suggestion'),
					],
				},
				{
					label: '3. Nghiên cứu viên',
					translations: { en: '3. Researchers' },
					items: [
						item('nghien-cuu/duyet-de-xuat', 'Duyệt phiếu đề xuất', 'Review suggestions'),
						item('nghien-cuu/gan-nhan', 'Gắn nhãn bài (AI hỗ trợ)', 'Label posts (AI-assisted)'),
						item('nghien-cuu/huong-dan-gan-nhan', 'Hướng dẫn gắn nhãn bài (bảng mã v1)', 'Post labeling guide (codebook v1)'),
					],
				},
				{
					label: '4. Quản trị',
					translations: { en: '4. Administration' },
					items: [
						item('quan-tri/cau-hinh', 'Cấu hình khóa hệ thống & AI', 'System keys & AI settings'),
						item('quan-tri/do-tuong-tac', 'Đo tương tác (Social Fetch)', 'Engagement tracking (Social Fetch)'),
						item('quan-tri/quet-chinh-thuc', 'Quét chính thức (đang phát triển)', 'Official scans (in development)'),
					],
				},
				{
					label: '5. Thiết kế đang phát triển (tạm thời)',
					translations: { en: '5. Design in progress (temporary)' },
					collapsed: false,
					items: [
						item('thiet-ke', 'Đọc trước: trạng thái & cách góp ý', 'Read first: status & how to give feedback'),
						item('thiet-ke/quy-trinh-tong-the', 'Quy trình tổng thể: công cụ nào, vì sao', 'Overall workflow: which tools, and why'),
						item('thiet-ke/hai-luong-quet', 'Hai luồng quét: Phát hiện / Đo tương tác', 'Two scan flows: Discovery / Engagement'),
						item('thiet-ke/sang-loc-ai', 'Sàng lọc bài: AI và người', 'Screening posts: AI and humans'),
						item('thiet-ke/huong-dan-ma-hoa', 'Hướng dẫn mã hóa: triết lý, cơ sở khoa học', 'Coding guide: rationale and evidence base'),
						item('thiet-ke/cau-hoi-nghien-cuu', 'Câu hỏi nghiên cứu và biểu đồ', 'Research questions and charts'),
						item('thiet-ke/chon-cong-cu-quet', 'Chọn công cụ quét', 'Choosing scan tools'),
						item('thiet-ke/han-che', 'Hạn chế của hệ thống', 'System limitations'),
						item('thiet-ke/du-lieu-gia-va-dashboard', 'Dữ liệu giả và dashboard', 'Mock data and dashboard'),
						item('thiet-ke/du-lieu-phang', 'Dữ liệu phẳng cho phân tích', 'Flat data for analysis'),
					],
				},
				item('hoi-dap', 'Hỏi đáp', 'FAQ'),
			],
		}),
	],
});
