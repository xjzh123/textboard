from flask import Flask, request, send_file, redirect
import json
import hashlib
import pathlib
import random


def readdb():
  try:
    with open('data.json', encoding='UTF-8') as f:
      return json.loads(f.read())
  except (json.JSONDecodeError, FileNotFoundError):
    with open('data.json', 'w', encoding='UTF-8') as f:
      f.write('{}')
    with open('data.json', encoding='UTF-8') as f:
      return json.loads(f.read())


if not pathlib.Path('salt.txt').is_file():
  with open('salt.txt', 'w') as f:
    f.write(str(random.random() * 114514))

with open('salt.txt') as f:
  salt = f.read()


def hash(data: str):
  if data is None:
    return
  obj = hashlib.md5(salt.encode('utf-8'))
  obj.update(data.encode('utf-8'))
  result = obj.hexdigest()
  return result


app = Flask(__name__)


def get(index):
  return request.values.get(index)


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
    db = readdb()
    if shouldCreate:
      db[index] = {}
      if get('viewpwd') is not None:
        print(get('viewpwd'))
        db[index]['viewpwd'] = hash(get('viewpwd'))
      if get('editpwd') is not None:
        print(get('editpwd'))
        db[index]['editpwd'] = hash(get('editpwd'))
    db[index]['text'] = get('text')
    with open('data.json', 'w', encoding='UTF-8') as f:
      f.write(json.dumps(db))
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


if __name__ == '__main__':
  app.run(host='0.0.0.0')
