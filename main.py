from flask import Flask, request, send_file, redirect, jsonify
import json
import hashlib
import pathlib
import random
import time
import secrets
from sys import gettrace
from urllib.parse import unquote
from gevent import pywsgi
import pickledb

VER = 'beta 0.7'

db = pickledb.load('data.json', True)

if not pathlib.Path('salt.txt').is_file():
    with open('salt.txt', 'w') as f:
        f.write(secrets.token_hex())
        print('[DEBUG] new salt generated and saved in salt.txt')

with open('salt.txt') as f:
    salt = f.read()
    print(f'[DEBUG] salt: {salt}')


def getHash(data: str):
    if data is None:
        return
    obj = hashlib.md5(salt.encode('utf-8'))
    obj.update(data.encode('utf-8'))
    result = obj.hexdigest()
    return result


app = Flask(__name__)


def getReqPara(index):
    result = request.values.get(index)
    return unquote(result) if result is not None else result

# app routes!


@app.route('/api/read', methods=['GET', 'POST'])
def read():
    canRead = False
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'successful', 'text': ''})

    if 'viewpwd' not in page.keys():
        canRead = True
    else:
        canRead = getHash(getReqPara('password')) == page['viewpwd']
    if canRead:
        return jsonify({'status': 'successful', 'text': page["text"]})
    else:
        return jsonify({
            'status':
            'error',
            'reason':
            'wrong password or password not provided, permission denied'
        })


@app.route('/api/check', methods=['GET', 'POST'])
def check():
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'successful', 'existing': False})
    else:
        return jsonify({
            'status': 'successful',
            'existing': True,
            'viewpwd': 'viewpwd' in page.keys(),
            'editpwd': 'editpwd' in page.keys(),
            'masterpwd': 'masterpwd' in page.keys()
        })


@app.route('/api/write', methods=['GET', 'POST'])
def write():
    canWrite = False
    shouldCreate = False
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        canWrite = True
        shouldCreate = True
    else:
        if 'editpwd' not in page.keys():
            if 'viewpwd' in page.keys():
                canWrite = getHash(getReqPara('viewpwd')) == db.get()
            else:
                canWrite = True
        else:
            canWrite = getHash(getReqPara('password')) == page['editpwd']
    if canWrite:
        if shouldCreate: # 我在客户端角度思考问题，这样很繁琐，不便于扩展。应该从服务端角度思考问题，先设置一个页面（创建这一步放在设置里）再让客户端传递内容过来，这样这个函数就不需要搞这么多花里胡哨的
            newPage = {}
            if getReqPara('viewpwd') is not None:
                newPage['viewpwd'] = getHash(getReqPara('viewpwd'))
            if getReqPara('editpwd') is not None:
                newPage['editpwd'] = getHash(getReqPara('editpwd'))
            if getReqPara('masterpwd') is not None:
                newPage['masterpwd'] = getHash(getReqPara('masterpwd'))
        else:
            newPage = page
        newPage['text'] = getReqPara('text')
        db.set(index, newPage)
        return jsonify({'status': 'successful'})
    else:
        return jsonify({
            'status':
            'error',
            'reason':
            'wrong password or password not provided, permission denied'
        })


@app.route('/api/manage', methods=['GET', 'POST'])
def manage():
    canManage = False
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({
            'status':
            'error',
            'reason':
            'page not found'
        })
    canManage = getHash(getReqPara('password')) == page['managepwd']
    if canManage:
        newPage = page
        if getReqPara('newviewpwd') is not None:
            newPage['viewpwd'] = getHash(getReqPara('newviewpwd'))
        else:
            if 'viewpwd' in newPage.keys():
                del newPage['viewpwd']
        if getReqPara('neweditpwd') is not None:
            newPage['editpwd'] = getHash(getReqPara('neweditpwd'))
        else:
            if 'editpwd' in newPage.keys():
                del newPage['editpwd']
        db.set(index, newPage)
        return jsonify({'status': 'successful'})
    else:
        return jsonify({
            'status':
            'error',
            'reason':
            'wrong password or password not provided, permission denied!!!'
        })


@app.route('/api/backup', methods=['GET', 'POST'])
def exportData():
    key = getReqPara('key')
    if getHash(key) == '6a940461c12f09e8ce1e5b8104046c68':
        return send_file(
            'data.json',
            download_name=f'{time.strftime("%Y-%m-%d %H %M %S")}.data.json',
            as_attachment=True)
    else:
        return jsonify({'status': 'error'})


@app.route('/api/ver', methods=['GET', 'POST'])
def ver():
    return jsonify({'ver': VER})


@app.route('/', methods=['GET', 'POST'])
def view_beta():
    return send_file('beta.html')


@app.route('/<index>', methods=['GET', 'POST'])
def link(index):
    if index == 'favicon.ico':
        return send_file('/static/textboard-icon-new.svg')
    else:
        return redirect('/?' + index)


if __name__ == '__main__':
    if gettrace():  # check whether program is running under debug mode
        app.run(host='0.0.0.0')
    else:
        server = pywsgi.WSGIServer(('0.0.0.0', 5000), app)
        server.serve_forever()
