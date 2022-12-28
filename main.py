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

VER = 'beta 0.6.8'

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


def get(index):
  result = request.values.get(index)
  return unquote(result) if result is not None else result

# app routes!

@app.route('/api/read', methods=['GET', 'POST'])
def read():
  canRead = False
  index = get('index')
  if index not in db.getall():
    return jsonify({'status': 'successful', 'text': ''})
  if 'viewpwd' not in db.get(index).keys():
    canRead = True
  else:
    pwd = get('password')
    if getHash(pwd) == db.get(index)['viewpwd']:
      canRead = True
  if canRead:
    return jsonify({'status': 'successful', 'text': db.get(index)["text"]})
  else:
    return jsonify({
      'status':
      'error',
      'reason':
      'wrong password or password not provided, permission denied'
    })


@app.route('/api/check', methods=['GET', 'POST'])
def check():
  index = get('index')
  if index not in db.getall():
    return jsonify({'status': 'successful', 'existing': False})
  else:
    return jsonify({
      'status': 'successful',
      'existing': True,
      'viewpwd': 'viewpwd' in db.get(index).keys(),
      'editpwd': 'editpwd' in db.get(index).keys()
    })


@app.route('/api/write', methods=['GET', 'POST'])
def write():
  canWrite = False
  shouldCreate = False
  index = get('index')
  if index not in db.getall():
    canWrite = True
    shouldCreate = True
  else:
    if 'editpwd' not in db.get(index).keys():
      canWrite = True
    else:
      pwd = get('password')
      if getHash(pwd) == db.get(index)['editpwd']:
        canWrite = True
  if canWrite:
    if shouldCreate:
      newPage = {}
      if get('viewpwd') is not None:
        newPage['viewpwd'] = getHash(get('viewpwd'))
      if get('editpwd') is not None:
        newPage['editpwd'] = getHash(get('editpwd'))
    else:
      newPage = db.get(index)
    newPage['text'] = get('text')
    db.set(index, newPage)
    return jsonify({'status': 'successful'})
  else:
    return jsonify({
      'status':
      'error',
      'reason':
      'wrong password or password not provided, permission denied'
    })


@app.route('/api/backup', methods=['GET', 'POST'])
def exportData():
  key = get('key')
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
  if gettrace(): # check whether program is running under debug mode
    app.run(host='0.0.0.0')
  else:
    server = pywsgi.WSGIServer(('0.0.0.0', 5000), app)
    server.serve_forever()
