import { Remarkable } from 'https://cdnjs.cloudflare.com/ajax/libs/remarkable/2.0.1/remarkable.min.js'

import { hljs } from 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js'

import misc from './misc';

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
    input = $('#textarea')
    input.style.height = 0;
    input.style.height = input.scrollHeight + 'px';
}

$('#textarea') = updateTextareaSize

updateTextareaSize()

/* ---------------------------------------------------------------- */

let date = new Date
if (date.getDate() == 25 && date.getMonth() + 1 == 12) { // Christmas
    misc.addSnowflake()
}

/* ---------------------------------------------------------------- */

let pagedata = { doPageExist: null, doEditNeedPwd: null, doViewNeedPwd: null, doPageHaveMasterPwd: null, successful: null, viewpwd: null, editpwd: null }

function scrollToAnchor() {
    if (document.getElementById(location.hash.slice(1))) {
        document.getElementById(location.hash.slice(1)).scrollIntoView()
    } else if (document.getElementsByName(location.hash.slice(1))) {
        document.getElementsByName(location.hash.slice(1)).scrollIntoView()
    }
}

function show(data) {
    if (data.status == 'error') {
        $('#edit').disabled = true
        jq('#text').text('密码错误，查看失败')
        alert('密码错误，查看失败')
    } else if (typeof data.text == 'string') {
        pagedata.text = data.text
        pagedata.successful = true
        $('#text').innerHTML = md.render(data.text)
        scrollToAnchor()
    }
}

function write(data) {
    if (data.status == 'error') {
        alert('密码错误，修改失败')
    }
}

function check(index) {
    fetch(`/api/check?index=${index}`).then(function (data) {
        pagedata.doViewNeedPwd = data.viewpwd
        pagedata.doEditNeedPwd = data.editpwd
        pagedata.doPageHaveMasterPwd = data.masterpwd
        pagedata.doPageExist = data.existing
        if (data.existing) {
            $('#edit').textContent = '编辑'
            $('#manage').classList.remove('hidden')
            if (!data.masterpwd) {
                $('#manage').disabled = true
            }
        } else {
            $('#edit').textContent = '创建'
        }
        if (!data.viewpwd) {
            jq.post(`/api/read`, { index: index }, show)
        } else {
            password = pagedata.viewpwd ? pagedata.viewpwd : prompt('请输入查看密码：')
            if (password == undefined) {
                $('#edit').disabled = true
                jq('#text').text('未输入密码，无法查看')
                return
            }
            if (typeof password == 'string') pagedata.viewpwd = password
            jq.post(`/api/read`, { index: index, password: password }, show)
        }
    })
}

function edit() {
    if (!pagedata.successful) {
        return
    }
    if (!pagedata.edit) {
        $('#textarea').textContent = pagedata.text
        $('#textarea').value = pagedata.text
        pagedata.edit = true

        $('#edit').classList.add('hidden')
        $('#submit').classList.remove('hidden')
        $('#text').classList.add('hidden')
        $('#textarea').classList.remove('hidden')
        updateTextareaSize()
    }
}

function submit() {
    if (!pagedata.successful) {
        return
    }
    if (!pagedata.edit) {
        return
    }
    payload = { index: index, text: $('#textarea').value }
    if (pagedata.doPageExist) {
        let password
        if (pagedata.doEditNeedPwd) {
            password = pagedata.editpwd ? pagedata.editpwd : prompt('请输入编辑密码：')
            if (password == undefined) return
            if (typeof password == 'string') pagedata.editpwd = password
        }
        if (password) {
            payload.password = password
        }
    } else {
        editpwd = prompt('请为该页面设置编辑密码，直接确定则不设密码：')
        viewpwd = prompt('请为该页面设置查看密码，直接确定则不设密码：')
        masterpwd = prompt('请为该页面设置管理密码（以修改其它密码），直接确定则不设密码：')
        if (editpwd) {
            payload.editpwd = editpwd
        }
        if (viewpwd) {
            payload.viewpwd = viewpwd
        }
        if (masterpwd) {
            payload.masterpwd = masterpwd
        }
    }
    pagedata.successful = false
    jq('#text').text('正在重新加载……')
    jq.post(`/api/write`, payload, write)
    jq.get(`/api/check?index=${index}`, check)
    pagedata.edit = false

    $('#edit').classList.remove('hidden')
    $('#submit').classList.add('hidden')
    $('#text').classList.remove('hidden')
    $('#textarea').classList.add('hidden')
}




function manage() {
    if (!pagedata.successful || pagedata.edit || !pagedata.doPageExist) {
        return
    }
    if (pagedata.doPageHaveMasterPwd) {
        masterpwd = prompt('请输入管理密码：')
    } else {
        alert('抱歉，无法管理当前页面')
        return
    }
    payload = { index: index, text: $('#textarea').value }
    editpwd = prompt('请为该页面设置新的编辑密码，直接确定则编辑该页面无需密码：')
    viewpwd = prompt('请为该页面设置新的查看密码，直接确定则查看该页面无需密码：')
    if (editpwd) {
        payload.neweditpwd = editpwd
    }
    if (viewpwd) {
        payload.newviewpwd = viewpwd
    }
    jq.post('/api/manage', payload)
}

fetch(`/api/check?index=${index}`, { method: 'GET' }).then(res => res.json()).then(check)
