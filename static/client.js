const index = location.search.slice(1)

import * as remarkable from 'https://cdn.skypack.dev/remarkable'

import hljs from 'https://cdn.skypack.dev/highlight.js'

import misc from './misc.js'

import { cookie, Cookie } from 'https://cdn.jsdelivr.net/npm/cookie.js'

/**
 * 
 * @type {Function}
 * @param {string} selector
 * @returns {Element}
 */
function $(selector) {
    return document.querySelector(selector)
}

if (index.length > 0) {
    document.title = `${index} - Textboard Beta`
}

/* ---------------------------------------------------------------- */

let md = new remarkable.Remarkable({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(lang, str).value
            } catch (err) { }
        }

        try {
            return hljs.highlightAuto(str).value
        } catch (err) { }

        return '' // use external default escaping
    }
})

md.core.ruler.enable([
    'abbr',
])
md.block.ruler.enable([
    'footnote',
    'deflist',
])
md.inline.ruler.enable([
    'footnote_inline',
    'ins',
    'mark',
    'sub',
    'sup',
])


md.renderer.rules.text = function (tokens, idx) {
    tokens[idx].content = remarkable.utils.escapeHtml(tokens[idx].content)

    if (tokens[idx].content.indexOf('?') !== -1) {
        tokens[idx].content = tokens[idx].content.replace(/(^|\s)(\/?\?)\S+?(?=[,.!?:)]?\s|$)/gm, function (match) {
            var pageLink = remarkable.utils.escapeHtml(remarkable.utils.replaceEntities(match.trim()))
            var whiteSpace = ''
            if (match[0] !== '?' && match[0] !== '/') {
                whiteSpace = match[0]
            }
            return whiteSpace + '<a href="' + pageLink.replace(/^\s?\//, '') + '" target="_blank" rel="noopener">' + pageLink + '</a>'
        })
    }

    return tokens[idx].content
}

/* ---------------------------------------------------------------- */

function updateTextareaSize() {
    let textarea = $('#textarea')
    textarea.style.height = 0
    textarea.style.height = textarea.scrollHeight + 'px'
}

$('#textarea').addEventListener('input', updateTextareaSize)

$('#textarea').addEventListener('keydown', function (e) {
    if (e.keyCode == 83 /* S */ && e.ctrlKey) {
        e.preventDefault()
        savePage()
    } else if (e.keyCode == 27 /* ESC */) {
        e.preventDefault()

        $('#textarea').blur()
    } else if (e.keyCode == 9 /* TAB */) {
        // Tab complete nicknames starting with @

        if (e.ctrlKey) {
            // Skip autocompletion and tab insertion if user is pressing ctrl
            // ctrl-tab is used by browsers to cycle through tabs
            return;
        }
        e.preventDefault()
        insertAtCursor('\t')
    }
})

function insertAtCursor(text) {
    var input = $('#textarea')
    var start = input.selectionStart || 0
    var before = input.value.substr(0, start)
    var after = input.value.substr(start)

    before += text
    input.value = before + after
    input.selectionStart = input.selectionEnd = before.length

    updateTextareaSize()
}

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

const jsonHeader = new Headers({ 'Content-Type': 'application/json' })

/** ??????????????????????????????????????????????????????????????? */
let locals = {
    /** ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
    page: {},

    /** ???????????????????????????????????????????????????????????????????????? */
    local: {},

    /** ?????????????????????????????? */
    loadSuccessful: null,

    /** ?????????????????????????????? */
    editing: null,

    /** ???????????????????????????????????????????????? */
    pwd: {},
}

locals.pwd = cookie.get(`password-${index}`) ?
    JSON.parse(cookie.get(`password-${index}`)) : {}


async function fetchPage() {
    await updatePageInfo({ index })

    modifyPage()

    let password = accessPassword('viewpwd')
    if (password === false) {
        return false
    }

    await loadContent({ index, password })
    scrollToAnchor()
}

async function updatePageInfo(payload = { index }) {
    await fetch(`/api/check?index=${payload.index}`).then(res => res.json()).then((data) => {
        locals.page = { ...locals.page, ...data } // ??????????????????????????????
    })
}

function modifyPage() {
    $('#edit').innerHTML = locals.page.existing ? '??????' : '??????'

    if (locals.page.managepwd) {
        $('#manage').classList.remove('hidden')
    }
}

async function loadContent(payload) {
    await fetch(`/api/read`, { method: 'POST', headers: jsonHeader, body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            locals.loadSuccessful = false
            $('#edit').disabled = true
            showContent('???????????????????????????')
            alert('???????????????????????????')
            // ??????
            delete locals.pwd['viewpwd']
            cookie.set(`password-${index}`, JSON.stringify(locals.pwd))
            // ?????????????????????
        } else if (typeof data.text == 'string') {
            locals.local.text = data.text
            locals.loadSuccessful = true
            showContent(md.render(data.text))
        } else {
            locals.loadSuccessful = false
            $('#edit').disabled = true
            showContent('???????????????????????????')
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

    let res

    if (!locals.page.existing) {
        res = await createNew()
    } else {
        res = await saveEdit()
    }

    if (res === false) {
        return false
    }

    await fetchPage()
    locals.editing = false
    hideEditor()
}

async function createNew() {
    let setviewpwd = askPassword('viewpwd', { verb: '??????' })
    let seteditpwd = askPassword('editpwd', { verb: '??????' })
    let setmanagepwd = askPassword('managepwd', { verb: '??????' })

    if (setviewpwd === false || seteditpwd === false || setmanagepwd === false) {
        return false
    }


    locals.loadSuccessful = false
    showContent('??????????????????')
    hideEditor()

    await submitCreate({ index, setviewpwd, seteditpwd, setmanagepwd })

    await submitEdit({ index, password: seteditpwd, text: $('#textarea').value })
}

async function submitCreate(payload) {
    await fetch(`/api/create`, { method: 'POST', headers: jsonHeader, body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            alert('??????????????????????????????') // ??????
            delete locals.pwd['viewpwd']
            delete locals.pwd['editpwd']
            delete locals.pwd['managepwd']
            cookie.set(`password-${index}`, JSON.stringify(locals.pwd))
        }
    })
}

async function saveEdit() {
    let password = accessPassword('editpwd')
    if (password === false) {
        return false
    }

    locals.loadSuccessful = false
    showContent('??????????????????')
    hideEditor()

    await submitEdit({ index, password, text: $('#textarea').value })
}

async function submitEdit(payload = { index, text: $('#textarea').value }) {
    await fetch(`/api/write`, { method: 'POST', headers: jsonHeader, body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            alert('???????????????????????????') // ??????
            delete locals.pwd['editpwd']
            cookie.set(`password-${index}`, JSON.stringify(locals.pwd))
        } // ??????????????????????????????????????????????????????????????????
    })
}

async function managePage() {
    let password = accessPassword('managepwd')
    if (password === false || !locals.page.managepwd) {
        return false
    }

    let setviewpwd = askPassword('viewpwd', { verb: '??????' })
    let seteditpwd = askPassword('editpwd', { verb: '??????' })

    if (setviewpwd === false || seteditpwd === false || password === false) {
        return false
    }

    await submitManage({ index, password, setviewpwd, seteditpwd })

    await fetchPage()
}

async function submitManage(payload) {
    await fetch(`/api/manage`, { method: 'POST', headers: jsonHeader, body: JSON.stringify(payload) }).then(res => res.json()).then((data) => {
        if (data.status == 'error') {
            alert('???????????????????????????') // ??????
            delete locals.pwd['editpwd']
            cookie.set(`password-${index}`, JSON.stringify(locals.pwd))
        } // ??????????????????????????????????????????????????????????????????
    })
}

// ??????????????????????????????????????????????????????????????????????????????????????????
function accessPassword(name, ...args) {
    // ?????????????????????null?????????????????????????????????
    let password = locals.page[name] ? locals.pwd[name] : null
    // ?????????????????????????????????
    if (password === undefined) {
        password = askPassword(name, ...args)
    }
    return password
}

function askPassword(name, options = {}) {
    let promptText
    if ('prompt' in options) {
        promptText = options.prompt
    } else {
        let nameToText = {
            'viewpwd': '??????',
            'editpwd': '??????',
            'managepwd': '??????'
        }
        promptText =
            `???${options.verb ?? '??????'}${nameToText[name] ?? ''}?????????`
    }
    let password = prompt(promptText)
    if (typeof password != 'string') {
        return false
    }
    // ??????????????????
    locals.pwd[name] = password
    cookie.set(`password-${index}`, JSON.stringify(locals.pwd))
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

window.onbeforeunload = function (e) {
    if (locals.editing) {
        e.preventDefault()

        return '' //https://developer.mozilla.org/docs/Web/API/Window/beforeunload_event
    }
}

/* ---------------------------------------------------------------- */

$('#edit').onclick = startEdit
$('#submit').onclick = savePage
$('#manage').onclick = managePage

await fetchPage()
