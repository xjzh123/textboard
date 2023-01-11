import { Remarkable } from 'https://cdnjs.cloudflare.com/ajax/libs/remarkable/2.0.1/remarkable.min.js'

import { hljs } from 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js'

import misc from './misc';

import { cookie, Cookie } from 'https://cdn.jsdelivr.net/npm/cookie.js'

const index = location.search.slice(1)

const jq = jQuery.noConflict();

/**
 * 
 * @type {Function}
 * @param {string} selector
 * @returns {Element}
 */
const $ = document.querySelector.bind(document)

/**
 * 
 * @type {Function}
 * @param {string} selector
 * @returns {Array[Element]}
 */
const $$ = document.querySelectorAll.bind(document)

if (index.length > 0) {
    document.title = `${index} - Textboard Beta`
}

/* ---------------------------------------------------------------- */

let md = new Remarkable({
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
        tokens[idx].content = tokens[idx].content.replace(/(^|\s)(\/?\?)\S+?(?=[,.!?:)]?\s|jq)/gm, function (match) {
            let pageLink = remarkable.utils.escapeHtml(remarkable.utils.replaceEntities(match.trim()));
            let whiteSpace = '';
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

$('#textarea') = updateTextareaSize

updateTextareaSize()

function scrollToAnchor() {
    if (document.getElementById(location.hash.slice(1))) {
        document.getElementById(location.hash.slice(1)).scrollIntoView()
    } else if (document.getElementsByName(location.hash.slice(1))) {
        document.getElementsByName(location.hash.slice(1))[0].scrollIntoView()
    }
}

/* ---------------------------------------------------------------- */

let date = new Date
if (date.getDate() == 25 && date.getMonth() + 1 == 12) { // Christmas
    misc.addSnowflake()
}

/* ---------------------------------------------------------------- */

let status = {
    page: {},
    local: {},
    loadSuccessful: null,
    editing: null,
    pwd: {},
}

try {
    status.pwd = cookie.get('password')
} catch (e) { }

function fetchPage() {
    updatePageInfo()
    let password = payloadPassword('viewpwd')
    loadContent({ index, password })
    scrollToAnchor()
}

function updatePageInfo(payload) {
    fetch(`/api/check?index=${payload.index}`).then((data) => {
        status.page = { ...status.page, ...data }
    })
}

function loadContent(payload) {
    fetch(`/api/read`, { method: 'POST', body: JSON.stringify(payload) }).then((data) => {
        if (data.status == 'error') {
            status.loadSuccessful = false
            $('#edit').disabled = true
            showContent('密码错误，查看失败')
            alert('密码错误，查看失败')
            // 报错
        } else if (typeof data.text == 'string') {
            status.local.text = data.text
            status.loadSuccessful = true
            showContent(md.renderer(data.text))
        }
    })
}

function startEdit() {
    if (!status.loadSuccessful || status.editing) return
    $('#textarea').value = pagedata.text
    status.editing = true
    showEditor()
}

function savePage() {
    if (!status.loadSuccessful || !status.editing) return
    let password = payloadPassword('editpwd')
    status.loadSuccessful = false
    $('#text').textContent = '正在提交……'
    submitEdit({ index, password })
    fetchPage()
    status.editing = false
    hideEditor()
}

function submitEdit(payload) {
    fetch(`/api/write`, { method: 'POST', body: JSON.stringify(payload) }).then((data) => {
        if (data.status == 'error') {
            alert('密码错误，修改失败') // 报错
        } // 经我检查，此处的回调确实就只有报错这一个功能
    })
}

function showContent(text) {
    $('#text').innerHTML = text
}

// 解释代码是新手的行为，但这个函数我确实无从下手，必须解释一下
function payloadPassword(name) {
    // 不需要密码就用null，需要密码就找历史密码
    let password = status.page[name] ? status.pwd[name] : null
    // 没有历史密码就要求输入
    if (password === undefined) {
        password = prompt('请输入查看密码：')
        if (typeof password != 'string') {
            // 报错
            return false
        }
        // 记录历史密码
        status.pwd[name] = password
        cookie.set('password', JSON.stringify(status.pwd), {
            path: location.pathname
        })
    }
    return password
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

fetchPage()
