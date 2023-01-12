from flask import Flask, request, send_file, redirect, jsonify
import hashlib
import pathlib
import time
import secrets
from sys import gettrace
from urllib.parse import unquote
from gevent import pywsgi
import pickledb
from functools import wraps
import logging

logging.basicConfig(level=logging.DEBUG)

VER = 'beta 0.7'

db = pickledb.load('data.json', True)

if not pathlib.Path('salt.txt').is_file():
    with open('salt.txt', 'w') as f:
        f.write(secrets.token_hex())
        logging.info('New salt generated and saved in salt.txt')

with open('salt.txt') as f:
    salt = f.read()
    logging.info(f'Salt: {salt}')


def getHash(data: str):
    if data is None:
        return
    obj = hashlib.md5(salt.encode('utf-8'))
    obj.update(data.encode('utf-8'))
    result = obj.hexdigest()
    return result


app = Flask(__name__)


def getReqPara(index):
    if request.method == 'POST' and request.content_type == 'application/json':
        result = request.json.get(index)
    else:
        result = request.values.get(index)

    return unquote(result) if result is not None else result


def logger(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        app.logger.debug(
            'parameters: ' +
            str(
                request.json
                if request.method == 'POST' and request.content_type == 'application/json'
                else request.values
            )
        )
        res = func(*args, **kwargs)
        if res.content_type == 'application/json':
            app.logger.debug('returns: ' + str(res.data))
        return res
    return decorated



@app.route('/api/read', methods=['GET', 'POST'])
@logger
def read():
    canRead = False
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'successful', 'text': ''})

    canRead = (getHash(getReqPara('password')) == page['viewpwd']
               if 'viewpwd' in page else True)

    if canRead:
        return jsonify({'status': 'successful', 'text': page["text"]})
    else:
        return jsonify({'status': 'error', 'reason': 'wrong password or password not provided, permission denied'})


@app.route('/api/check', methods=['GET', 'POST'])
@logger
def check():
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'successful', 'existing': False})
    else:
        return jsonify({'status': 'successful', 'existing': True, 'viewpwd': 'viewpwd' in page, 'editpwd': 'editpwd' in page, 'managepwd': 'managepwd' in page})


@app.route('/api/write', methods=['GET', 'POST'])
@logger
def write():
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'error', 'reason': 'page not found. please create first.'})

    canWrite = (
        getHash(getReqPara('password')) == page['editpwd'] if 'editpwd' in page
        else (
            getHash(getReqPara('password')) == page['viewpwd'] if 'viewpwd' in page
            else True
        )
    )

    if not canWrite:
        return jsonify({'status': 'error', 'reason': 'wrong password or password not provided, permission denied'})

    newPage = page
    newPage['text'] = getReqPara('text')
    db.set(index, newPage)
    return jsonify({'status': 'successful'})


@app.route('/api/create', methods=['GET', 'POST'])
@logger
def create():
    index = getReqPara('index')
    page = db.get(index)
    if index in db.getall():
        return jsonify({'status': 'error', 'reason': 'page already exists'})

    if None in (getReqPara('setviewpwd'), getReqPara('seteditpwd'), getReqPara('setmanagepwd')):
        return jsonify({'status': 'error', 'reason': 'password not set'})

    page = {'text': ''}

    # 在读取的时候可以传None意思是不需要密码，但是创建的时候不应该None。
    if getReqPara('setviewpwd') != '':
        page['viewpwd'] = getHash(getReqPara('setviewpwd'))

    if getReqPara('seteditpwd') != '':
        page['editpwd'] = getHash(getReqPara('seteditpwd'))

    if getReqPara('setmanagepwd') != '':
        page['managepwd'] = getHash(getReqPara('setmanagepwd'))

    db.set(index, page)
    return jsonify({'status': 'successful'})


@app.route('/api/manage', methods=['GET', 'POST'])
@logger
def manage():
    index = getReqPara('index')
    page = db.get(index)
    if index not in db.getall():
        return jsonify({'status': 'error', 'reason': 'page not found'})

    canManage = getHash(getReqPara('password')
                        ) == page['managepwd'] if 'managepwd' in page else False
    if not canManage:
        return jsonify({'status': 'error', 'reason': 'wrong password or password not provided, permission denied'})

    if None in (getReqPara('setviewpwd'), getReqPara('seteditpwd')):
        return jsonify({'status': 'error', 'reason': 'password not set'})

    newPage = page
    if getReqPara('setviewpwd') != '':
        newPage['viewpwd'] = getHash(getReqPara('setviewpwd'))
    else:
        if 'viewpwd' in newPage.keys():
            del newPage['viewpwd']
    if getReqPara('seteditpwd') != '':
        newPage['editpwd'] = getHash(getReqPara('seteditpwd'))
    else:
        if 'editpwd' in newPage.keys():
            del newPage['editpwd']
    db.set(index, newPage)
    return jsonify({'status': 'successful'})


@app.route('/api/backup', methods=['GET', 'POST'])
@logger
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
@logger
def ver():
    return jsonify({'ver': VER})


@app.route('/beta', defaults={'index': ''})
@app.route('/beta/<index>')
@logger
def noBeta(index):
    return redirect(('/?' + (index if index else request.query_string.decode())).rstrip('?'))


@app.route('/', methods=['GET', 'POST'])
@logger
def view():
    return send_file('index.html')


@app.route('/favicon.ico')
@logger
def favicon():
    return send_file('/static/textboard-icon-new.svg')


@app.route('/', methods=['GET', 'POST'])
def view():
  return send_file('index.html')


@app.route('/beta/<index>', methods=['GET', 'POST'])
def link_beta(index):
  return redirect('/beta?' + index)


@app.route('/<index>', methods=['GET', 'POST'])
@logger
def link(index):
    return redirect('/?' + index)


if __name__ == '__main__':
    if gettrace():  # check whether program is running under debug mode
        app.run(host='0.0.0.0')
    else:
        logging.basicConfig(level=logging.INFO)
        app.logger.info('Server Ready')
        server = pywsgi.WSGIServer(('0.0.0.0', 5000), app)
        server.serve_forever()
