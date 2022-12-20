var index = location.search.slice(1)

if (index.length > 0) {
    document.title = 'TextBoard - ' + index
}

var pagedata = { doPageExist: undefined, doEditNeedPwd: undefined, doViewNeedPwd: undefined, successful: undefined, viewpwd: undefined, editpwd: undefined }

function read(data) {
    data = JSON.parse(data)
    if (data.status == 'error') {
        $('#text').text('密码错误，查看失败')
    } else if (typeof data.text == 'string') {
        pagedata.text = data.text
        pagedata.successful = true
        $('#text')[0].textContent = data.text
    }
}

function check(data) {
    data = JSON.parse(data)
    pagedata.doViewNeedPwd = data.viewpwd
    pagedata.doEditNeedPwd = data.editpwd
    pagedata.doPageExist = data.existing
    if (!data.viewpwd) {
        $.post(`/api/read/`, { index: index }, read)
    } else {
        password = pagedata.viewpwd ? pagedata.viewpwd : prompt('请输入查看密码：')
        if (password == undefined) return
        $.post(`/api/read/`, { index: index, password: password }, read)
    }
}

$.get(`/api/check/?index=${index}`, check)

function edit() {
    if (!pagedata.successful) {
        return
    }
    if (!pagedata.edit) {
        $('#textarea')[0].textContent = pagedata.text
        $('#textarea')[0].value = pagedata.text
        pagedata.edit = true

        $('#edit')[0].classList.add('hidden')
        $('#submit')[0].classList.remove('hidden')
        $('#text')[0].classList.add('hidden')
        $('#textarea')[0].classList.remove('hidden')
    }
}

function submit() {
    if (!pagedata.successful) {
        return
    }
    if (!pagedata.edit) {
        return
    }
    payload = { index: index, text: $('#textarea')[0].value }
    if (pagedata.doPageExist) {
        let password
        if (pagedata.doEditNeedPwd) {
            password = pagedata.editpwd ? pagedata.editpwd : prompt('请输入编辑密码：')
            if (password == undefined) return
        }
        if (password) {
            payload.password = password
        }
    } else {
        editpwd = prompt('请为该页面设置编辑密码，直接确定则不设密码：')
        viewpwd = prompt('请为该页面设置查看密码，直接确定则不设密码：')
        if (editpwd) {
            payload.editpwd = editpwd
        }
        if (viewpwd) {
            payload.viewpwd = viewpwd
        }
    }
    pagedata.successful = false
    $('#text').text('正在重新加载……')
    $.post(`/api/write/`, payload, read)
    setTimeout(function () {
        $.get(`/api/check/?index=${index}`, check)
        pagedata.edit = false

        $('#edit')[0].classList.remove('hidden')
        $('#submit')[0].classList.add('hidden')
        $('#text')[0].classList.remove('hidden')
        $('#textarea')[0].classList.add('hidden')
    }, 0.01)//如果太快了，服务端还没创建好页面，会认为页面不存在
}

function updateTextareaSize () {
    input = $('#textarea')[0]
	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
}

$('#textarea')[0].oninput = updateTextareaSize

updateTextareaSize()