from flask import Flask, request, send_file, redirect
import json


def readdb():
    with open('data.json', encoding='UTF-8') as f:
        return json.loads(f.read())


app = Flask(__name__)

def get(index):
    return request.values.get(index)

@app.route('/api/read/',methods=['GET','POST'])
def read():
    canRead = False
    index = get('index')
    if index not in readdb().keys():
        return json.dumps({ 'status': 'successful', 'text': '' })
    if 'viewpwd' not in readdb()[index].keys():
        canRead = True
    else:
        pwd = get('password')
        if pwd == readdb()[index]['viewpwd']:
            canRead = True
    if canRead:
        return json.dumps({ 'status': 'successful', 'text': readdb()[index]["text"] })
    else:
        return json.dumps({ 'status': 'error', 'reason': 'wrong password or password not provided, permission denied' })


@app.route('/api/check/',methods=['GET','POST'])
def check():
    index = get('index')
    if index not in readdb().keys():
        return json.dumps({'status': 'successful', 'existing': False})
    else:
        return json.dumps({'status': 'successful', 'existing': True, 'viewpwd': 'viewpwd' in readdb()[index].keys(), 'editpwd': 'editpwd' in readdb()[index].keys()})


@app.route('/api/write/',methods=['GET','POST'])
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
            if pwd == readdb()[index]['editpwd']:
                canWrite = True
    if canWrite:
        db = readdb()
        if shouldCreate:
            db[index] = {}
            if get('viewpwd'):
                db[index]['viewpwd'] = get('viewpwd')
            if get('editpwd'):
                db[index]['editpwd'] = get('password')
        db[index]['text'] = get('text')
        with open('data.json', 'w', encoding='UTF-8') as f:
            f.write(json.dumps(db))
        return json.dumps({'status': 'successful'})
    else:
        return json.dumps({'status': 'error', 'reason': 'wrong password or password not provided, permission denied'})


@app.route('/',methods=['GET','POST'])
def view():
    return send_file('template.html')


@app.route('/<index>/',methods=['GET','POST'])
def link(index):
    return redirect('/?'+index)


if __name__ == '__main__':
    app.run()
