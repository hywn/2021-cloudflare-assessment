const BASE_URL = 'https://cloudf.jh7qbe.workers.dev'
const post_cache = {}

const path = new URLSearchParams(location.search).get('path') || 'top'

document.querySelector('title').setAttribute('value', path)

const parts = path.split('.')
document.querySelector('#disp_path').innerHTML = `viewing ${
	parts.map((name, i) => `<a href="?path=${parts.slice(0, i + 1).join('.')}">${name}</a>`).join('.')
}`

const escape_html = txt => txt
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#039;')

const my_list = txt => {
	const res = { level: -1, children: [] }

	const insert = (parent, child) => (child.level <= parent.level)
		? false
		: parent.children.reduceRight((bool, c) => bool || insert(c, child), false)
			? true
			: (parent.children.push(child), true)

	for (const line of txt.split('\n').filter(x => x.trim())) {
		const [, spacing, content] = line.match(/^( *)- (.+)/)
		insert(res, { content, level: spacing.length, children: [] })
	}

	const s_ul = children => `<ul>${children.map(s_li).join('')}</ul>`
	const s_li = ({ content, children }) => `<li>${content}${children.length === 0 ? '' : s_ul(children)}</li>`

	return s_ul(res.children)
}

const my_markdown = str => escape_html(str)
	.replaceAll(/^# (.+)/gm, `<h1>$1</h1>`)
	.replaceAll(/^## (.+)/g, `<h2>$1</h2>`)
	.replaceAll(/\!\[(.+?)\]\((.+?)\)/g, `<img src='$2' alt='$1' />`)
	.replaceAll(/\[(.+?)\]\(marquee\)/g, `<marquee>$1</marquee>`)
	.replaceAll(/\[(.+?)\]\((.+?)\)/g, `<a href='$2'>$1</a>`)
	.replaceAll(/(?:^ *- .+\n?)+/gm, my_list)
	.replace(/\n/g, '<br/>')

const toggleraw = id => {
	if (!post_cache[id]) return
	const post = post_cache[id]
	document.querySelector(`#${id}`).innerHTML = (post.raw = !post.raw)
		? `<pre>${escape_html(post.content)}</pre>`
		: my_markdown(post.content)
}

const by_date = (a, b) => b.date - a.date

const display = post => {
	const path = (post.id.match(/posts\/\d+\.(.+)/) || [])[1]
	const link = `<a href='?path=${path}'>[view/reply]</a>`

	if (post.truncated) return `<div class=post>(truncated): ${link}</div>`

	const dom_id = path.replaceAll('.', '-')
	post_cache[dom_id] = post
	post.raw = false

	return `<div class='post'>
		(${new Date(post.date).toLocaleString()}) by ${escape_html(post.username)}
			<a href='javascript:toggleraw("${dom_id}")'>[toggle raw]</a> ${link}
		<blockquote id='${dom_id}'>${my_markdown(post.content)}</blockquote>
		${post.children.sort(by_date).map(display).join('')}
	</div>`
}

// displays post to page
const display_posts = async json => {
	json ??= await fetch(`${BASE_URL}/posts/${path}`).then(r => r.json())

	document.querySelector('#disp_posts').innerHTML =
		`<dl>${path === 'top' ? json.children.sort(by_date).map(display).join('') : display(json)}</dl>`
}

display_posts()

const BUT_SUBMIT = document.querySelector('#but_submit')
const TXT_USERNAME = document.querySelector('#txt_username')
const TXT_CONTENT = document.querySelector('#txt_content')

BUT_SUBMIT.addEventListener('click', e => {
	const username = TXT_USERNAME.value
	const content = TXT_CONTENT.value

	const data =
		{ parent: path
		, username
		, content
		}

	fetch(`${BASE_URL}/posts`, { method: 'post', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain' } })
		.then(r => r.json())
		.then(display_posts)

	TXT_CONTENT.value = TXT_USERNAME.value = ''
})