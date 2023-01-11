const index = location.search.slice(1)

import * as remarkable from 'https://cdn.skypack.dev/remarkable'

import hljs from 'https://cdn.skypack.dev/highlight.js'

import misc from './misc.js';

import { cookie, Cookie } from 'https://cdn.jsdelivr.net/npm/cookie.js'

/**
 * 
 * @type {Function}
 * @param {string} selector
 * @returns {Element}
 */
function $(selector) {
    return document.querySelector(selector);
}

if (index.length > 0) {
    document.title = `${index} - Textboard Beta`
}

/* ---------------------------------------------------------------- */

let md = new remarkable.Remarkable({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(lang, str).value;
            } catch (err) { }
        }

        try {
            return hljs.highlightAuto(str).value;
        } catch (err) { }

        return ''; // use external default escaping
    }
});

md.core.ruler.enable([
    'abbr',
]);
md.block.ruler.enable([
    'footnote',
    'deflist',
]);
md.inline.ruler.enable([
    'footnote_inline',
    'ins',
    'mark',
    'sub',
    'sup',
]);


md.renderer.rules.text = function (tokens, idx) {
    tokens[idx].content = remarkable.utils.escapeHtml(tokens[idx].content);

    if (tokens[idx].content.indexOf('?') !== -1) {
        tokens[idx].content = tokens[idx].content.replace(/(^|\s)(\/?\?)\S+?(?=[,.!?:)]?\s|$)/gm, function (match) {
            var pageLink = remarkable.utils.escapeHtml(remarkable.utils.replaceEntities(match.trim()));
            var whiteSpace = '';
            if (match[0] !== '?' && match[0] !== '/') {
                whiteSpace = match[0];
            }
            return whiteSpace + '<a href="' + pageLink.replace(/^\s?\//, '') + '" target="_blank">' + pageLink + '</a>';
        });
    }

    return tokens[idx].content;
};

/* ---------------------------------------------------------------- */

function updateTextareaSize() {
    let textarea = $('#textarea')
    textarea.style.height = 0;
    textarea.style.height = textarea.scrollHeight + 'px';
}

$('#textarea').addEventListener('input', updateTextareaSize)

updateTextareaSize()

function scrollToAnchor() {
    if (document.getElementById(location.hash.slice(1))) {
        document.getElementById(location.hash.slice(1)).scrollIntoView()
    } else if (document.getElementsByName(location.hash.slice(1))[0]) {
        document.getElementsByName(location.hash.slice(1))[0].scrollIntoView()
    }
}

/* ---------------------------------------------------------------- */

let date = new Date
if (date.getDate() == 25 && date.getMonth() + 1 == 12) { // Christmas
    misc.addSnowflake()
}

/* ---------------------------------------------------------------- */

let locals = {
    page: {},
    local: {},
    loadSuccessful: null,
    editing: null,
    pwd: {},
}

locals.pwd = cookie.get(`password-${index}`) ?
    JSON.parse(cookie.get(`password-${index}`)) : {}


async function fetchPage() {
    await updatePageInfo({ index })

    let password = accessPassword('viewpwd')
    if (password === false) {
        return false
    }

    await loadContent({ index, password })
    scrollToAnchor()
}

async function updatePageInfo(payload = { index }) {
    await fetch(`/api/check?index=${payload.index}`).then(res => res.json()).then((data) => {
        locals.page = { ...locals.page, ...data } // 用展开运算符合并对象
    })
}

async function loadContent(payload) {
    await fetch(`/api/read`, { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            locals.loadSuccessful = false
            $('#edit').disabled = true
            showContent('密码错误，查看失败')
            alert('密码错误，查看失败')
            // 报错
            delete locals.pwd['viewpwd']
            cookie.set(`password-${index}`, locals.pwd)
            // 删除错误的密码
        } else if (typeof data.text == 'string') {
            locals.local.text = data.text
            locals.loadSuccessful = true
            showContent(md.render(data.text))
        } else {
            locals.loadSuccessful = false
            $('#edit').disabled = true
            showContent('未知错误，查看失败')
        }
    })
}

function startEdit() {
    if (!locals.loadSuccessful || locals.editing) {
        return false
    }

    $('#textarea').value = locals.local.text
    locals.editing = true
    showEditor()
}

async function savePage() {
    if (!locals.loadSuccessful || !locals.editing) {
        return false
    }

    let password = accessPassword('editpwd')
    if (password === false) {
        return false
    }

    locals.loadSuccessful = false
    $('#text').textContent = '正在提交……'
    await submitEdit({ index, password, text: $('#textarea').value })

    await fetchPage()
    locals.editing = false
    hideEditor()
}

async function submitEdit(payload = { index, text: $('#textarea').value }) {
    await fetch(`/api/write`, { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            alert('密码错误，修改失败') // 报错
            delete locals.pwd['editpwd']
            cookie.set(`password-${index}`, locals.pwd)
        } // 经我检查，此处的回调确实就只有报错这一个功能
    })
}

// 解释代码是新手的行为，但这个函数我确实无从下手，必须解释一下
function accessPassword(name, promptText) {
    // 不需要密码就用null，需要密码就找历史密码
    let password = locals.page[name] ? locals.pwd[name] : null
    // 没有历史密码就要求输入
    if (password === undefined) {
        if (promptText === undefined) {
            let nameToText = {
                'viewpwd': '查看',
                'editpwd': '编辑',
            }
            promptText = (name in nameToText) ?
                `请输入${nameToText[name]}密码：` : '请输入密码：'
        }
        password = prompt(promptText)
        if (typeof password != 'string') {
            return false
        }
        // 记录历史密码
        locals.pwd[name] = password
        cookie.set(`password-${index}`, JSON.stringify(locals.pwd), {
            path: location.pathname
        })
    }
    return password
}


function showContent(text) {
    $('#text').innerHTML = text
}

function showEditor() {
    $('#edit').classList.add('hidden')
    $('#submit').classList.remove('hidden')
    $('#text').classList.add('hidden')
    $('#textarea').classList.remove('hidden')
    updateTextareaSize()
}

function hideEditor() {
    $('#edit').classList.remove('hidden')
    $('#submit').classList.add('hidden')
    $('#text').classList.remove('hidden')
    $('#textarea').classList.add('hidden')
}

/* ---------------------------------------------------------------- */

$('#edit').onclick = startEdit
$('#submit').onclick = savePage

await fetchPage()
