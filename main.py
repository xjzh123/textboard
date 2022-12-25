from flask import Flask, request, send_file, redirect
import json
import hashlib
import pathlib
import random
import time
import os
from urllib.parse import unquote
from gevent import pywsgi

isWriting = False


def readdb():
  try:
    with open('data.json', encoding='UTF-8') as f:
      return json.loads(f.read())
  except (json.JSONDecodeError, FileNotFoundError):
    try:
      print('[DEBUG] Json data broken. Trying to repair data...')
      with open('data.json', encoding='UTF-8') as f:
        old = f.read()
        old2 = old[0] + '"' + old[2:]
      t = time.strftime('%Y-%m-%d %H %M %S')
      with open(f'{t}.data.json', 'w', encoding='UTF-8') as f:
        f.write(old2)
      print(f'[DEBUG] Trying to save old data to {t}.data.json...')
      os.remove('data.json')
      with open('data.json', 'w', encoding='UTF-8') as f:
        f.write(old2)
      return json.loads(old2)
    except:
      print('[DEBUG] Json data broken. Resetting data...')
      with open('data.json', 'w', encoding='UTF-8') as f:
        f.write('{}')
      with open('data.json', encoding='UTF-8') as f:
        return json.loads(f.read())


if not pathlib.Path('salt.txt').is_file():
  with open('salt.txt', 'w') as f:
    f.write(str(random.random() * 114514))
    print('[DEBUG] new salt generated and saved in salt.txt')

with open('salt.txt') as f:
  salt = f.read()
  print(f'[DEBUG] salt: {salt}')

print('[DEBUG] WSGI ready')


def hash(data: str):
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


@app.route('/api/read/', methods=['GET', 'POST'])
def read():
  canRead = False
  index = get('index')
  if index not in readdb().keys():
    return json.dumps({'status': 'successful', 'text': ''})
  if 'viewpwd' not in readdb()[index].keys():
    canRead = True
  else:
    pwd = get('password')
    if hash(pwd) == readdb()[index]['viewpwd']:
      canRead = True
  if canRead:
    return json.dumps({
      'status': 'successful',
      'text': readdb()[index]["text"]
    })
  else:
    return json.dumps({
      'status':
      'error',
      'reason':
      'wrong password or password not provided, permission denied'
    })


@app.route('/api/check/', methods=['GET', 'POST'])
def check():
  while isWriting:
    time.sleep(0.01)
  index = get('index')
  if index not in readdb().keys():
    return json.dumps({'status': 'successful', 'existing': False})
  else:
    return json.dumps({
      'status': 'successful',
      'existing': True,
      'viewpwd': 'viewpwd' in readdb()[index].keys(),
      'editpwd': 'editpwd' in readdb()[index].keys()
    })


@app.route('/api/write/', methods=['GET', 'POST'])
def write():
  global isWriting
  canWrite = False
  shouldCreate = False
  index = get('index')
  if index not in readdb().keys():
    canWrite = True
    shouldCreate = True
  else:
    if 'editpwd' not in readdb()[index].keys():
      canWrite = True
    else:
      pwd = get('password')
      if hash(pwd) == readdb()[index]['editpwd']:
        canWrite = True
  if canWrite:
    isWriting = True
    db = readdb()
    if shouldCreate:
      db[index] = {}
      if get('viewpwd') is not None:
        db[index]['viewpwd'] = hash(get('viewpwd'))
      if get('editpwd') is not None:
        db[index]['editpwd'] = hash(get('editpwd'))
    db[index]['text'] = get('text')
    with open('data.json', 'w', encoding='UTF-8') as f:
      f.write(json.dumps(db))
    isWriting = False
    return json.dumps({'status': 'successful'})
  else:
    return json.dumps({
      'status':
      'error',
      'reason':
      'wrong password or password not provided, permission denied'
    })


@app.route('/', methods=['GET', 'POST'])
def view():
  return send_file('template.html')


@app.route('/<index>/', methods=['GET', 'POST'])
def link(index):
  return redirect('/?' + index)




@app.route('/api/backup/')
def exportData():
  key = get('key')
  if hash(key) == '6a940461c12f09e8ce1e5b8104046c68':
    return send_file('data.json', as_attachment=True)
  else:
    return json.dumps({'status': 'error'})


if __name__ == '__main__':
  #app.run(host='0.0.0.0'

  server = pywsgi.WSGIServer(('0.0.0.0', 5000), app)
  server.serve_forever()
